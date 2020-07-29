import { getVirtualID } from './Utils';
import Base from './Base';
import TextEditorUtils from '../common/TextEditorUtils';

class LogTopic extends Base {
    static createVirtual({ parentLogTopic, name, hasStructure }) {
        return {
            __type__: 'log-topic',
            id: getVirtualID(),
            parentLogTopic: parentLogTopic || null,
            name: name || '',
            details: '',
            onSidebar: false,
            hasStructure: typeof hasStructure !== 'undefined' ? hasStructure : false,
        };
    }

    static async validateInternal(inputLogTopic) {
        const results = [];
        results.push(Base.validateNonEmptyString('.name', inputLogTopic.name));
        return results;
    }

    static async load(id) {
        const logTopic = await this.database.findByPk('LogTopic', id, this.transaction);
        let outputParentLogTopic = null;
        if (logTopic.parent_topic_id) {
            const parentLogTopic = await this.database.findByPk(
                'LogTopic',
                logTopic.parent_topic_id,
                this.transaction,
            );
            outputParentLogTopic = {
                __type__: 'log-topic',
                id: parentLogTopic.id,
                name: parentLogTopic.name,
            };
        }
        return {
            __type__: 'log-topic',
            id: logTopic.id,
            parentLogTopic: outputParentLogTopic,
            name: logTopic.name,
            details: logTopic.details,
            onSidebar: logTopic.on_sidebar,
            hasStructure: logTopic.has_structure,
        };
    }

    static async save(inputLogTopic) {
        let logTopic = await this.database.findItem(
            'LogTopic',
            inputLogTopic,
            this.transaction,
        );

        const parentTopicId = inputLogTopic.parentLogTopic
            ? inputLogTopic.parentLogTopic.id
            : null;
        Base.broadcast.call(
            this,
            'log-topic-list',
            logTopic,
            { parent_topic_id: parentTopicId },
        );

        const originalName = logTopic ? logTopic.name : null;
        const orderingIndex = await Base.getOrderingIndex.call(this, logTopic);
        const fields = {
            id: inputLogTopic.id,
            parent_topic_id: parentTopicId,
            ordering_index: orderingIndex,
            name: inputLogTopic.name,
            details: inputLogTopic.details,
            on_sidebar: inputLogTopic.onSidebar,
            has_structure: inputLogTopic.hasStructure,
        };
        logTopic = await this.database.createOrUpdateItem(
            'LogTopic', logTopic, fields, this.transaction,
        );

        const targetLogTopics = TextEditorUtils.extractLogTopics(
            TextEditorUtils.deserialize(
                logTopic.details,
                TextEditorUtils.StorageType.DRAFTJS,
            ),
        );
        await this.database.setEdges(
            'LogTopicToLogTopic',
            'source_topic_id',
            logTopic.id,
            'target_topic_id',
            Object.values(targetLogTopics).reduce((result, targetLogTopic) => {
                // eslint-disable-next-line no-param-reassign
                result[targetLogTopic.id] = {};
                return result;
            }, {}),
            this.transaction,
        );

        if (originalName && originalName !== logTopic.name) {
            const outputLogTopic = await LogTopic.load.call(this, logTopic.id);
            await LogTopic.updateLogEvents.call(this, outputLogTopic);
            await LogTopic.updateLogStructures.call(this, outputLogTopic);
            await LogTopic.updateLogTopics.call(this, outputLogTopic);
        }

        return logTopic.id;
    }

    static async updateLogEvents(updatedLogTopic) {
        const logEventEdges = await this.database.getEdges(
            'LogEventToLogTopic',
            'topic_id',
            updatedLogTopic.id,
            this.transaction,
        );
        const outputLogEvents = await Promise.all(
            logEventEdges.map(
                (edge) => this.invoke.call(this, 'log-event-load', { id: edge.event_id }),
            ),
        );
        await Promise.all(
            outputLogEvents.map((outputLogEvent) => {
                outputLogEvent.title = LogTopic.updateContent(
                    outputLogEvent.title, [updatedLogTopic],
                );
                outputLogEvent.details = LogTopic.updateContent(
                    outputLogEvent.details, [updatedLogTopic],
                );
                return this.invoke.call(this, 'log-event-upsert', outputLogEvent);
            }),
        );
    }

    static async updateLogStructures(updatedLogTopic) {
        const outputLogStructures = await this.invoke.call(this, 'log-structure-list');
        await Promise.all(
            outputLogStructures
                .filter((outputLogStructure) => {
                    const logTopics = TextEditorUtils.extractLogTopics(
                        TextEditorUtils.deserialize(
                            outputLogStructure.titleTemplate,
                            TextEditorUtils.StorageType.DRAFTJS,
                        ),
                    );
                    return logTopics[updatedLogTopic.id];
                })
                .map((outputLogStructure) => {
                    outputLogStructure.titleTemplate = LogTopic.updateContent(
                        outputLogStructure.titleTemplate, [updatedLogTopic],
                    );
                    return this.invoke.call(this, 'log-structure-upsert', outputLogStructure);
                }),
        );
    }

    static async updateLogTopics(updatedLogTopic) {
        const logTopicEdges = await this.database.getEdges(
            'LogTopicToLogTopic',
            'target_topic_id',
            updatedLogTopic.id,
            this.transaction,
        );
        const outputLogTopics = await Promise.all(
            logTopicEdges.map(
                (edge) => this.invoke.call(this, 'log-topic-load', { id: edge.source_topic_id }),
            ),
        );
        await Promise.all(
            outputLogTopics
                .filter((outputLogTopic) => {
                    const logTopics = TextEditorUtils.extractLogTopics(
                        TextEditorUtils.deserialize(
                            outputLogTopic.details,
                            TextEditorUtils.StorageType.DRAFTJS,
                        ),
                    );
                    return logTopics[updatedLogTopic.id];
                })
                .map((outputLogTopic) => {
                    outputLogTopic.details = LogTopic.updateContent(
                        outputLogTopic.details, [updatedLogTopic],
                    );
                    return this.invoke.call(this, 'log-topic-upsert', outputLogTopic);
                }),
        );
    }

    static updateContent(value, oldLogTopics, newLogTopics = null) {
        let content = TextEditorUtils.deserialize(
            value,
            TextEditorUtils.StorageType.DRAFTJS,
        );
        content = TextEditorUtils.updateDraftContent(
            content,
            oldLogTopics,
            newLogTopics || oldLogTopics,
        );
        return TextEditorUtils.serialize(
            content,
            TextEditorUtils.StorageType.DRAFTJS,
        );
    }

    static async delete(id) {
        const logTopic = await this.database.deleteByPk('LogTopic', id, this.transaction);
        Base.broadcast.call(this, 'log-topic-list', logTopic, ['parent_topic_id']);
        return { id: logTopic.id };
    }
}

export default LogTopic;
