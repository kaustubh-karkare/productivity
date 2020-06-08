import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import { MdAddCircleOutline } from 'react-icons/md';
import React from 'react';
import { TextEditor } from '../Common';
import { LogCategoryTypeahead } from '../LogCategory';
import { LogValueListEditor } from '../LogValue';
import PropTypes from '../prop-types';

import { createEmptyLogCategory, createEmptyLogEntry, createEmptyLogValue } from '../Data';
import deepcopy from '../../common/deepcopy';

class LogEntryEditor extends React.Component {
    LogEntryEditor.propTypes = {
        logEntry: PropTypes.Custom.LogEntry,
    };

    constructor(props) {
        super(props);
        this.state = {
            logEntry: this.props.logEntry || createEmptyLogEntry(),
        };
    }

    getTitleRow() {
        return (
            <InputGroup className="my-1" size="sm">
                <InputGroup.Prepend>
                    <InputGroup.Text style={{ width: 100 }}>
                        Title
                    </InputGroup.Text>
                </InputGroup.Prepend>
                <Form.Control
                    type="text"
                    value={this.state.logEntry.title}
                    onChange={(event) => {
                        const { value } = event.target;
                        // eslint-disable-next-line no-param-reassign
                        this.updateLogEntry((logEntry) => { logEntry.title = value; });
                    }}
                />
            </InputGroup>
        );
    }

    renderAddLogValueButton() {
        if (this.state.logEntry.logCategory.id > 0) {
            return;
        }
        return (
            <InputGroup.Append>
                <Button
                    onClick={() => this.setState((state) => {
                    const logEntry = { ...state.logEntry };
                    logEntry.logValues = [...logEntry.logValues];
                    logEntry.logValues.push(createEmptyLogValue());
                    return { logEntry };
                })}
                    size="sm"
                    variant="secondary"
                >
                    <MdAddCircleOutline />
                </Button>
            </InputGroup.Append>
        );
    }

    getCategoryRow() {
        return (
            <InputGroup className="my-1" size="sm">
                <InputGroup.Prepend>
                    <InputGroup.Text style={{ width: 100 }}>
                        Category
                    </InputGroup.Text>
                </InputGroup.Prepend>
                <LogCategoryTypeahead
                    allowDelete={true}
                    logCategory={this.state.logEntry.logCategory}
                    onUpdate={(logCategory) => this.updateLogEntry((logEntry) => {
                        // eslint-disable-next-line no-param-reassign
                        logEntry.logCategory = logCategory;
                        logEntry.logValues = logCategory.logKeys.map(
                            logKey => createEmptyLogValue(logKey)
                        );
                    })}
                    onDelete={() => this.updateLogEntry((logEntry) => {
                        // eslint-disable-next-line no-param-reassign
                        logEntry.logCategory = createEmptyLogCategory();
                        logEntry.logValues = [];
                    })}
                />
                {this.renderAddLogValueButton()}
            </InputGroup>
        );
    }

    getDetailsRow() {
        return (
            <InputGroup className="my-1" size="sm">
                <InputGroup.Prepend>
                    <InputGroup.Text style={{ width: 99 }}>
                        Details
                    </InputGroup.Text>
                </InputGroup.Prepend>
                <TextEditor
                    value={this.state.logEntry.details}
                    onUpdate={(value) => this.updateLogEntry((logEntry) => {
                        // eslint-disable-next-line no-param-reassign
                        logEntry.details = value;
                    })}
                />
            </InputGroup>
        );
    }

    updateLogEntry(method) {
        this.setState((state) => {
            const logEntry = deepcopy(state.logEntry);
            method(logEntry, state);
            return { logEntry };
        });
    }

    render() {
        return (
            <div>
                {this.getTitleRow()}
                {this.getCategoryRow()}
                <LogValueListEditor
                    allowReorder={false}
                    isNewCategory={this.state.logEntry.logCategory.id < 0}
                    logValues={this.state.logEntry.logValues}
                    onUpdate={(logValues) => this.setState((state) => {
                        const logEntry = { ...state.logEntry };
                        logEntry.logValues = logValues;
                        return { logEntry };
                    })}
                />
                {this.getDetailsRow()}
            </div>
        );
    }
}

export default LogEntryEditor;