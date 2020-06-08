import { AsyncTypeahead } from 'react-bootstrap-typeahead';
import Button from 'react-bootstrap/Button';
import { FaRegEdit } from 'react-icons/fa';
import { GiCancel } from 'react-icons/gi';
import React from 'react';
import PropTypes from 'prop-types';

import 'react-bootstrap-typeahead/css/Typeahead.min.css';

const RENAME_KEY = '__rename_key__';

class Typeahead extends React.Component {
    static propTypes = {
        allowUpdate: PropTypes.bool,
        allowDelete: PropTypes.bool,
        filterBy: PropTypes.func,
        id: PropTypes.string.isRequired,
        labelKey: PropTypes.string.isRequired,
        onUpdate: PropTypes.func.isRequired,
        onDelete: PropTypes.func,
        placeholder: PropTypes.string.isRequired,
        rpcName: PropTypes.string.isRequired,
        // eslint-disable-next-line react/forbid-prop-types
        value: PropTypes.any.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = { isLoading: false, options: [] };
    }

    renderUpdateButton() {
        if (!this.props.allowUpdate) {
            return null;
        }
        return (
            <Button
                onClick={() => {
                    this.props.onUpdate({ ...this.props.value, [RENAME_KEY]: true });
                }}
                size="sm"
                title="Edit"
                variant="secondary"
            >
                <FaRegEdit />
            </Button>
        );
    }

    renderDeleteButton() {
        if (!this.props.allowDelete || this.props.value.id < 0) {
            return null;
        }
        return (
            <Button
                onClick={() => this.props.onDelete(this.props.value)}
                size="sm"
                title="Cancel"
                variant="secondary"
            >
                <GiCancel />
            </Button>
        );
    }

    render() {
        return (
            <>
                <AsyncTypeahead
                    {...this.state}
                    id={this.props.id}
                    labelKey={this.props.labelKey}
                    size="small"
                    minLength={0}
                    disabled={
                        this.props.value
                        && this.props.value.id > 0
                        && !this.props.value[RENAME_KEY]
                    }
                    onSearch={(query) => this.onSearch(query)}
                    filterBy={this.props.filterBy}
                    placeholder={this.props.placeholder}
                    selected={[this.props.value && this.props.value[this.props.labelKey]]}
                    onInputChange={(text) => this.onInputChange(text)}
                    onChange={(selected) => {
                        if (selected.length) {
                            this.props.onUpdate(selected[0]);
                        }
                    }}
                    renderMenuItemChildren={
                        (option) => (
                            <div onMouseDown={() => this.props.onUpdate(option)}>
                                {option[this.props.labelKey]}
                            </div>
                        )
                    }
                />
                {this.renderUpdateButton()}
                {this.renderDeleteButton()}
            </>
        );
    }

    onInputChange(text) {
        this.onSearch(text);
        this.props.onUpdate({ ...this.props.value, [this.props.labelKey]: text });
    }

    onSearch(query) {
        this.setState({ isLoading: true }, () => {
            window.api.send(this.props.rpcName, this.props.value, query)
                .then((options) => {
                    this.setState({ isLoading: false, options })
                });
        });
    }
}

export default Typeahead;