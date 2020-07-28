import React from 'react';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import {
    MdFavorite, MdFavoriteBorder, MdEdit, MdSearch,
} from 'react-icons/md';
import PropTypes from '../prop-types';
import { Coordinator, Dropdown, InputLine } from '../Common';
import LogTopicEditor from './LogTopicEditor';

class LogTopicDetailsHeader extends React.Component {
    // eslint-disable-next-line class-methods-use-this
    onEdit(logTopic) {
        Coordinator.invoke('modal-editor', {
            dataType: 'log-topic',
            EditorComponent: LogTopicEditor,
            valueKey: 'logTopic',
            value: logTopic,
        });
    }

    // eslint-disable-next-line class-methods-use-this
    renderTopicName(logTopic) {
        return (
            <a
                href="#"
                className="topic"
                onClick={() => Coordinator.invoke('details', logTopic)}
            >
                {logTopic.name}
            </a>
        );
    }

    renderChildTopics(logTopic) {
        return (
            <Dropdown
                disabled={this.props.disabled}
                options={{
                    name: 'log-topic-list',
                    args: {
                        where: { parent_topic_id: logTopic.id },
                        ordering: true,
                    },
                }}
                onChange={(childLogTopic) => Coordinator.invoke('details', childLogTopic)}
            >
                <a href="#" className="topic">...</a>
            </Dropdown>
        );
    }

    render() {
        const { logTopic } = this.props;
        return (
            <InputGroup>
                <Button
                    onClick={() => Coordinator.invoke('topic-select', logTopic)}
                    title="Search"
                >
                    <MdSearch />
                </Button>
                <Button
                    onClick={() => this.props.onChange({
                        ...logTopic,
                        onSidebar: !logTopic.onSidebar,
                    })}
                    title="Favorite?"
                >
                    {logTopic.onSidebar ? <MdFavorite /> : <MdFavoriteBorder />}
                </Button>
                <InputLine overflow styled className="px-2">
                    {logTopic.parentLogTopic
                        ? (
                            <>
                                {this.renderTopicName(logTopic.parentLogTopic)}
                                {' / '}
                            </>
                        )
                        : null}
                    {logTopic.name}
                    {!logTopic.hasStructure
                        ? (
                            <>
                                {' / '}
                                {this.renderChildTopics(logTopic)}
                            </>
                        )
                        : null}
                </InputLine>
                <Button title="Edit" onClick={() => this.onEdit(logTopic)}>
                    <MdEdit />
                </Button>
                {this.props.children}
            </InputGroup>
        );
    }
}

LogTopicDetailsHeader.propTypes = {
    logTopic: PropTypes.Custom.LogTopic.isRequired,
    disabled: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    children: PropTypes.any,
};

export default LogTopicDetailsHeader;