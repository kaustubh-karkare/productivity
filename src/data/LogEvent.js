import assert from 'assert';
import Base from './Base';
import LogStructure from './LogStructure';
import TextEditorUtils from '../common/TextEditorUtils';
import { getVirtualID } from './Utils';


const { LogLevel } = LogStructure;


class LogEvent extends Base {
    static createVirtual({
        date = null,
        title = null,
        logLevel = LogLevel.getIndex(LogLevel.NORMAL),
        logStructure = null,
        isComplete = true,
    }) {
        if (logStructure) {
            logStructure.logKeys.forEach((logKey) => {
                logKey.value = LogStructure.Key[logKey.type].default || null;
            });
        }
        // Abstraction leak! The LogEventSearch component filters to logLevels = [2,3] by default.
        if (Array.isArray(logLevel)) {
            [logLevel] = logLevel;
        }
        const logEvent = {
            __type__: 'log-event',
            date,
            orderingIndex: null,
            id: getVirtualID(),
            name: '',
            title,
            details: '',
            logLevel,
            isFavorite: false,
            isComplete,
            logStructure,
        };
        LogEvent.trigger(logEvent);
        return logEvent;
    }

    static async updateWhere(where) {
        if (where.dateOp) {
            assert(where.date !== null);
            assert(where.isComplete === false);
            where.date = {
                [this.database.Op.ne]: null,
                [this.database.Op[where.dateOp]]: where.date,
            };
        }
        delete where.dateOp;
        await Base.updateWhere.call(this, where, {
            date: 'date',
            logStructure: 'structure_id',
            isFavorite: 'is_favorite',
            isComplete: 'is_complete',
            logLevel: 'log_level',
        });
    }

    static trigger(logEvent) {
        if (logEvent.logStructure) {
            logEvent.title = TextEditorUtils.updateDraftContent(
                logEvent.logStructure.titleTemplate,
                logEvent.logStructure.logKeys,
                logEvent.logStructure.logKeys.map((logKey) => logKey.value || logKey),
                true, // evaluateExpressions
            );
            logEvent.logLevel = logEvent.logStructure.logLevel;
        }
        logEvent.name = TextEditorUtils.extractPlainText(logEvent.title);
    }

    static async validateInternal(inputLogEvent) {
        const results = [];
        results.push(Base.validateNonEmptyString('.title', inputLogEvent.name));
        if (inputLogEvent.logStructure) {
            const logStructureResults = await Base.validateRecursive(
                LogStructure, '.logStructure', inputLogEvent.logStructure,
            );
            results.push(...logStructureResults);

            const logKeyResults = await Promise.all(
                inputLogEvent.logStructure.logKeys.map(async (logKey, index) => {
                    if (logKey.isOptional && !logKey.value) return null;
                    const name = `.logKeys[${index}].value`;
                    if (!logKey.value) return [name, false, 'must be non-empty.'];
                    const KeyOption = LogStructure.Key[logKey.type];
                    let isValid = await KeyOption.validator(logKey.value, logKey, this);
                    if (!isValid && KeyOption.maybeFix) {
                        const fixedValue = KeyOption.maybeFix(logKey.value, logKey);
                        if (fixedValue) {
                            logKey.value = fixedValue;
                            isValid = true;
                        }
                    }
                    return [name, isValid, 'fails validation for specified type.'];
                }),
            );
            results.push(...logKeyResults.filter((result) => result));
        }
        if (inputLogEvent.isComplete) {
            results.push([
                '.date',
                inputLogEvent.date !== null,
                'should not be null.',
            ]);
        }
        return results;
    }

    static async load(id) {
        const logEvent = await this.database.findByPk('LogEvent', id);
        let outputLogStructure = null;
        if (logEvent.structure_id) {
            outputLogStructure = await LogStructure.load.call(this, logEvent.structure_id);
            const structureValues = JSON.parse(logEvent.structure_values);
            outputLogStructure.logKeys.forEach((logKey, index) => {
                logKey.value = structureValues[index] || null;
            });
        } else {
            assert(logEvent.structure_values === null);
        }
        return {
            __type__: 'log-event',
            id: logEvent.id,
            date: logEvent.date,
            orderingIndex: logEvent.ordering_index,
            name: logEvent.name,
            title: TextEditorUtils.deserialize(
                logEvent.title,
                TextEditorUtils.StorageType.DRAFTJS,
            ),
            details: TextEditorUtils.deserialize(
                logEvent.details,
                TextEditorUtils.StorageType.DRAFTJS,
            ),
            logLevel: logEvent.log_level,
            isFavorite: logEvent.is_favorite,
            isComplete: logEvent.is_complete,
            logStructure: outputLogStructure,
        };
    }

    static async save(inputLogEvent) {
        let logEvent = await this.database.findItem('LogEvent', inputLogEvent);

        Base.broadcast.call(this, 'log-event-list', logEvent, { date: inputLogEvent.date });

        // If is_complete was updated, reset ordering_index.
        const isCompleteChanged = logEvent
            ? logEvent.is_complete !== inputLogEvent.isComplete
            : true;
        const orderingIndex = await Base.getOrderingIndex
            .call(this, isCompleteChanged ? null : logEvent, { date: inputLogEvent.date });
        let logValues;
        if (inputLogEvent.logStructure) {
            logValues = inputLogEvent.logStructure.logKeys.map((logKey) => logKey.value);
        }
        const fields = {
            date: inputLogEvent.date,
            ordering_index: orderingIndex,
            name: inputLogEvent.name,
            title: TextEditorUtils.serialize(
                inputLogEvent.title,
                TextEditorUtils.StorageType.DRAFTJS,
            ),
            details: TextEditorUtils.serialize(
                inputLogEvent.details,
                TextEditorUtils.StorageType.DRAFTJS,
            ),
            log_level: inputLogEvent.logLevel,
            is_favorite: inputLogEvent.isFavorite,
            is_complete: inputLogEvent.isComplete,
            structure_id: inputLogEvent.logStructure ? inputLogEvent.logStructure.id : null,
            structure_values: logValues ? JSON.stringify(logValues) : null,
        };
        logEvent = await this.database.createOrUpdateItem('LogEvent', logEvent, fields);

        const targetLogTopics = {
            ...TextEditorUtils.extractMentions(inputLogEvent.title, 'log-topic'),
            ...TextEditorUtils.extractMentions(inputLogEvent.details, 'log-topic'),
        };
        if (logValues) {
            logValues.forEach((value) => {
                if (typeof value === 'object' && value && value.__type__ === 'log-topic') {
                    targetLogTopics[value.id] = value;
                }
            });
        }
        await this.database.setEdges(
            'LogEventToLogTopic',
            'source_event_id',
            logEvent.id,
            'target_topic_id',
            Object.values(targetLogTopics).reduce((result, targetLogTopic) => {
                // eslint-disable-next-line no-param-reassign
                result[targetLogTopic.id] = {};
                return result;
            }, {}),
        );

        this.broadcast('reminder-sidebar');
        return logEvent.id;
    }

    static async delete(id) {
        const logEvent = await this.database.deleteByPk('LogEvent', id);
        Base.broadcast.call(this, 'log-event-list', logEvent, ['date']);
        return { id: logEvent.id };
    }
}

LogEvent.LogLevel = LogLevel;

export default LogEvent;
