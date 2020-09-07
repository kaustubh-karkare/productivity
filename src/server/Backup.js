/* eslint-disable func-names */

import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// import TextEditorUtils from '../common/TextEditorUtils';
import { awaitSequence, getCallbackAndPromise } from '../data';
import ActionsRegistry from './ActionsRegistry';

function getDateAndTime() {
    const date = new Date();
    let dateLabel = date.getFullYear();
    dateLabel += (`0${(date.getMonth() + 1)}`).substr(-2);
    dateLabel += (`0${date.getDate()}`).substr(-2);
    let timeLabel = (`0${date.getHours()}`).substr(-2);
    timeLabel += (`0${date.getMinutes()}`).substr(-2);
    timeLabel += (`0${date.getSeconds()}`).substr(-2);
    return { date: dateLabel, time: timeLabel };
}

function parseDateAndTime(date, time) {
    return `${date.substr(0, 4)
    }-${date.substr(4, 2)
    }-${date.substr(6, 2)
    } ${time.substr(0, 2)
    }:${time.substr(2, 2)
    }:${time.substr(4, 2)}`;
}

function getFileName({ date, time, hash }) {
    return `backup-${date}-${time}-${hash}.json`;
}

function parseFileName(filename) {
    const matchResult = filename.match(/^backup-(\d+)-(\d+)-(\w+)\.json$/);
    return {
        hash: matchResult[3],
        timetamp: parseDateAndTime(matchResult[1], matchResult[2]),
    };
}

// Intermediate Operations (used by Migrations too).

ActionsRegistry['backup-file-load'] = async function ({ filename }) {
    const [callback, promise] = getCallbackAndPromise();
    fs.readFile(path.join(this.config.backup.location, filename), callback);
    const filedata = await promise;
    return JSON.parse(filedata);
};

ActionsRegistry['backup-file-save'] = async function ({ data }) {
    const { date, time } = getDateAndTime();

    const dataSerialized = JSON.stringify(data, null, '\t');
    const hash = crypto.createHash('md5').update(dataSerialized).digest('hex');

    try {
        const latestBackup = await this.invoke.call(this, 'backup-latest');
        if (latestBackup && hash === latestBackup.hash) {
            return { ...latestBackup, isUnchanged: true };
        }
    } catch (error) {
        assert(error.message === 'no backups found');
    }

    const [callback, promise] = getCallbackAndPromise();
    const filename = getFileName({ date, time, hash });
    fs.writeFile(path.join(this.config.backup.location, filename), dataSerialized, callback);
    await promise;
    this.broadcast('backup-latest');
    return {
        filename, date, time, hash,
    };
};

ActionsRegistry['backup-data-load'] = async function () {
    const data = {};
    await awaitSequence(this.database.getModelSequence(), async (model) => {
        try {
            const items = await model.findAll({ transaction: this.database.transaction });
            data[model.name] = items.map((item) => item.dataValues);
        } catch (error) {
            assert(error.toString().includes('SQLITE_ERROR: no such table'));
            data[model.name] = [];
        }
    });
    return data;
};

ActionsRegistry['backup-data-save'] = async function ({ data }) {
    await this.database.reset();
    await awaitSequence(this.database.getModelSequence(), async (model) => {
        const items = data[model.name] || [];
        if (model.name !== 'log_topics') {
            await awaitSequence(items, async (item) => {
                try {
                    await model.create(item, { transaction: this.database.transaction });
                } catch (error) {
                    // eslint-disable-next-line no-constant-condition
                    if (false) {
                        // eslint-disable-next-line no-console
                        console.error(model.name, item);
                    }
                    throw error;
                }
            });
        } else {
            await model.bulkCreate(items, { transaction: this.database.transaction });
        }
    });
};

// Actual API

ActionsRegistry['backup-save'] = async function ({ logging }) {
    const data = await this.invoke.call(this, 'backup-data-load');
    const result = await this.invoke.call(this, 'backup-file-save', { data });
    if (logging) {
        // eslint-disable-next-line no-console
        console.info(`Saved ${result.filename}${result.isUnchanged ? ' (unchanged)' : ''}`);
    }
    return result;
};

ActionsRegistry['backup-latest'] = async function () {
    const [callback, promise] = getCallbackAndPromise();
    fs.readdir(this.config.backup.location, callback);
    let filenames = await promise;
    filenames = filenames.filter((filename) => filename.startsWith('backup-')).sort();
    if (!filenames.length) {
        return null;
    }
    assert(filenames.length, 'no backups found');
    const filename = filenames[filenames.length - 1];
    const components = parseFileName(filename);
    return { filename, ...components };
};

ActionsRegistry['backup-load'] = async function ({ logging }) {
    const latestBackup = await this.invoke.call(this, 'backup-latest');
    assert(latestBackup, 'at least one backup is required');
    const data = await this.invoke.call(this, 'backup-file-load', { filename: latestBackup.filename });
    await this.invoke.call(this, 'backup-data-save', { data });
    if (logging) {
        // eslint-disable-next-line no-console
        console.info(`Loaded ${latestBackup.filename}`);
    }
    return latestBackup;
};

ActionsRegistry['backup-delete'] = async function ({ filename }) {
    const [callback, promise] = getCallbackAndPromise();
    fs.unlink(path.join(this.config.backup.location, filename), callback);
    return promise;
};
