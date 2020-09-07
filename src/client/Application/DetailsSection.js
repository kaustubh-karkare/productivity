import React from 'react';
import PropTypes from 'prop-types';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import {
    MdCheckCircle, MdClose, MdEdit, MdFavorite, MdFavoriteBorder, MdSearch,
} from 'react-icons/md';
import { RiLoaderLine } from 'react-icons/ri';
import {
    Coordinator, DataLoader, ScrollableSection, TextEditor, TypeaheadOptions, TypeaheadSelector,
    debounce,
} from '../Common';
import { LogEventDetailsHeader, LogEventEditor } from '../LogEvent';
import { LogStructureDetailsHeader, LogStructureEditor } from '../LogStructure';
import { LogTopicDetailsHeader, LogTopicEditor } from '../LogTopic';
import { LogTopic, getVirtualID } from '../../data';
import TextEditorUtils from '../../common/TextEditorUtils';

import './DetailsSection.css';

const HEADER_MAPPING = {
    'log-event': {
        HeaderComponent: LogEventDetailsHeader,
        EditorComponent: LogEventEditor,
        valueKey: 'logEvent',
    },
    'log-structure': {
        HeaderComponent: LogStructureDetailsHeader,
        EditorComponent: LogStructureEditor,
        valueKey: 'logStructure',
    },
    'log-topic': {
        HeaderComponent: LogTopicDetailsHeader,
        EditorComponent: LogTopicEditor,
        valueKey: 'logTopic',
    },
};

const NEW_TOPIC_ITEM = {
    __type__: 'log-topic',
    id: getVirtualID(),
    name: 'Create New Topic ...',
    getItem(option, item) {
        return new Promise((resolve) => {
            const parentLogTopic = item && item.__type__ === 'log-topic' ? item : null;
            Coordinator.invoke('modal-editor', {
                dataType: 'log-topic',
                EditorComponent: LogTopicEditor,
                valueKey: 'logTopic',
                value: LogTopic.createVirtual({ parentLogTopic }),
                onClose: (newLogTopic) => {
                    if (newLogTopic) {
                        resolve(newLogTopic);
                    } else {
                        resolve(null);
                    }
                },
            });
        });
    },
};

class DetailsSection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            item: null,
            isDirty: false,
            isSaveDisabled: false,
        };
        this.saveDebounced = debounce(this.saveNotDebounced, 500);
    }

    componentDidMount() {
        this.dataLoader = new DataLoader({
            getInput: () => {
                const { item } = this.props;
                if (!item) {
                    return null;
                } if (item.__type__ in HEADER_MAPPING) {
                    return {
                        name: `${item.__type__}-load`,
                        args: { id: item.id },
                    };
                }
                return null;
            },
            onData: (newItem) => {
                const oldItem = this.state.item;
                if (
                    oldItem
                    && newItem
                    && oldItem.__type__ === newItem.__type__
                    && oldItem.id === newItem.id
                ) {
                    this.setState((state) => {
                        const { details } = state.item; // copy local details
                        state.item = { ...newItem, details };
                        return state;
                    });
                } else {
                    this.setState({ item: newItem });
                }
            },
            onError: () => {
                const { item } = this.props;
                if (item) {
                    Coordinator.invoke(
                        'modal-error',
                        `${JSON.stringify(item, null, 4)}\n\nThis item does support details!`,
                    );
                }
                this.props.onChange(null);
            },
        });
    }

    componentDidUpdate() {
        this.dataLoader.reload();
    }

    componentWillUnmount() {
        this.dataLoader.stop();
    }

    onChange(item) {
        this.setState((state) => {
            state.item = item;
            state.isDirty = true;
            return state;
        }, this.saveDebounced);
    }

    onEditButtonClick() {
        const { item } = this.state;
        const { EditorComponent, valueKey } = HEADER_MAPPING[item.__type__];
        Coordinator.invoke('modal-editor', {
            dataType: item.__type__,
            EditorComponent,
            valueKey,
            value: item,
        });
    }

    getTypeaheadOptions() {
        return new TypeaheadOptions({
            serverSideOptions: [{ name: 'log-topic' }],
            suffixOptions: [NEW_TOPIC_ITEM],
            onSelect: async (option) => {
                if (option.getItem) {
                    this.setState({ isSaveDisabled: true });
                    const result = await option.getItem(option, this.state.item);
                    this.setState({ isSaveDisabled: false });
                    return result;
                }
                return undefined;
            },
        });
    }

    saveNotDebounced() {
        if (this.state.isSaveDisabled) {
            return;
        }
        const { item } = this.state;
        window.api.send(`${item.__type__}-upsert`, item)
            .then((newItem) => this.setState({
                isDirty: !TextEditorUtils.equals(item.details, newItem.details),
            }));
    }

    renderPrefixButtons(item) {
        const buttons = [];
        const { HeaderComponent } = HEADER_MAPPING[item.__type__];
        if (HeaderComponent.onSearchButtonClick) {
            buttons.push(
                <Button
                    key="search"
                    onClick={() => HeaderComponent.onSearchButtonClick(item)}
                    title="Search"
                >
                    <MdSearch />
                </Button>,
            );
        }
        if (typeof item.isFavorite === 'boolean') {
            buttons.push(
                <Button
                    key="favorite"
                    onClick={() => this.onChange({ ...item, isFavorite: !item.isFavorite })}
                    title="Favorite?"
                >
                    {item.isFavorite ? <MdFavorite /> : <MdFavoriteBorder />}
                </Button>,
            );
        }
        return buttons;
    }

    renderSuffixButtons(item) {
        return [
            <Button key="edit" title="Edit" onClick={() => this.onEditButtonClick()}>
                <MdEdit />
            </Button>,
            <Button key="status" title="Status">
                {this.state.isDirty ? <RiLoaderLine /> : <MdCheckCircle />}
            </Button>,
            <Button
                key="close"
                title="Close"
                onClick={() => this.props.onChange(null)}
            >
                <MdClose />
            </Button>,
        ];
    }

    renderHeader() {
        const { item } = this.state;
        if (item && item.__type__ in HEADER_MAPPING) {
            const { HeaderComponent, valueKey } = HEADER_MAPPING[item.__type__];
            const headerComponentProps = { [valueKey]: item };
            return (
                <InputGroup>
                    {this.renderPrefixButtons(item)}
                    <HeaderComponent {...headerComponentProps} />
                    {this.renderSuffixButtons(item)}
                </InputGroup>
            );
        }
        return (
            <InputGroup>
                <TypeaheadSelector
                    id="details-section-topic-or-structure"
                    serverSideTypes={['log-topic', 'log-structure']}
                    value={null}
                    disabled={this.props.disabled}
                    onChange={(newItem) => this.props.onChange(newItem)}
                    placeholder="Details ..."
                />
            </InputGroup>
        );
    }

    renderDetails() {
        if (!this.state.item) {
            return null;
        }
        return (
            <div>
                <TextEditor
                    unstyled
                    value={this.state.item.details}
                    onChange={(details) => this.onChange({ ...this.state.item, details })}
                    options={this.getTypeaheadOptions()}
                />
            </div>
        );
    }

    render() {
        return (
            <div className="details-section">
                <div className="mb-1">
                    {this.renderHeader()}
                </div>
                <ScrollableSection padding={20 + 4}>
                    {this.renderDetails()}
                </ScrollableSection>
            </div>
        );
    }
}

DetailsSection.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    item: PropTypes.any,
    disabled: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
};

export default DetailsSection;
