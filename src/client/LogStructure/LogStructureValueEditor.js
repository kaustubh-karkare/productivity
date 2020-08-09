import React from 'react';
import { Selector, TypeaheadInput, TypeaheadSelector } from '../Common';
import { LogStructure, getPartialItem } from '../../data';
import PropTypes from '../prop-types';

class LogStructureValueEditor extends React.Component {
    constructor(props) {
        super(props);
        this.ref = React.createRef();
    }

    update(value) {
        const logKey = { ...this.props.logKey };
        if (typeof value === 'object') {
            value = getPartialItem(value);
        }
        logKey.value = value;
        this.props.onChange(logKey);
    }

    focus() {
        this.ref.current.focus();
    }

    render() {
        const { logKey } = this.props;
        if (logKey.type === LogStructure.Key.LOG_TOPIC) {
            return (
                <TypeaheadSelector
                    dataType="log-topic"
                    value={logKey.value}
                    disabled={this.props.disabled}
                    onChange={(value) => this.update(value)}
                    where={{ parent_topic_id: logKey.parentLogTopic.id }}
                    ref={this.ref}
                />
            );
        } if (logKey.type === LogStructure.Key.YES_OR_NO) {
            return (
                <Selector.Binary
                    value={logKey.value === 'yes'}
                    disabled={this.props.disabled}
                    onChange={(value) => this.update(value ? 'yes' : 'no')}
                    ref={this.ref}
                />
            );
        }
        return (
            <TypeaheadInput
                id={logKey.name}
                value={logKey.value || ''}
                disabled={this.props.disabled}
                onChange={(value) => this.update(value)}
                onSearch={(query) => this.props.onSearch(query)}
                ref={this.ref}
            />
        );
    }
}

LogStructureValueEditor.propTypes = {
    logKey: PropTypes.Custom.LogStructureKey.isRequired,
    disabled: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
    onSearch: PropTypes.func.isRequired,
};

export default LogStructureValueEditor;