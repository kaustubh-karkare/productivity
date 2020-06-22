import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import PropTypes from 'prop-types';
import React from 'react';
import { TiMinus, TiPlus } from 'react-icons/ti';
import BulletListAdder from './BulletListAdder';
import BulletListItem from './BulletListItem';


class BulletList extends React.Component {
    static getDerivedStateFromProps(props, state) {
        if (state.items) {
            state.areAllExpanded = state.items
                .every((item) => state.isExpanded[item.id]);
        }
        return state;
    }

    static renderButton(label, method) {
        return (
            <Button
                onClick={method}
                size="sm"
                variant="secondary"
            >
                Save
            </Button>
        );
    }

    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        this.reload();
    }

    reload() {
        window.api.send(`${this.props.dataType}-list`)
            .then((items) => {
                this.setState((state) => ({
                    items,
                    isExpanded: state.isExpanded || {},
                }));
            });
    }

    toggleItem(item) {
        this.setState((state) => {
            state.isExpanded[item.id] = !state.isExpanded[item.id];
            return state;
        });
    }

    editItem(item) {
        this.setState({ editItem: item });
    }

    saveItem(item) {
        window.api.send(`${this.props.dataType}-upsert`, item)
            .then((savedItem) => {
                this.setState((state) => {
                    if (item.id < 0) {
                        state.items.push(savedItem);
                        if (state.areAllExpanded) {
                            state.isExpanded[savedItem.id] = true;
                        }
                    } else {
                        const index = state.items
                            .findIndex((existingItem) => existingItem.id === item.id);
                        state.items[index] = savedItem;
                    }
                    state.editItem = null;
                    return state;
                });
            });
    }

    deleteItem(item) {
        window.api.send(`${this.props.dataType}-delete`, item)
            .then(() => {
                this.setState((state) => {
                    const index = state.items
                        .findIndex((existingItem) => existingItem.id === item.id);
                    state.items.splice(index, 1);
                    delete state.isExpanded[item.id];
                    return state;
                });
            });
    }

    renderEditorModal() {
        if (!this.state.editItem) {
            return null;
        }
        const { EditorComponent } = this.props;
        return (
            <Modal
                show
                size="lg"
                onHide={() => this.setState({ editItem: null })}
                keyboard={false}
            >
                <Modal.Header closeButton>
                    <Modal.Title>Editor</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <EditorComponent
                        value={this.state.editItem}
                        onChange={(editItem) => this.setState({ editItem })}
                    />
                </Modal.Body>
                <Modal.Footer>
                    {BulletList.renderButton('Save', () => this.saveItem(this.state.editItem))}
                </Modal.Footer>
            </Modal>
        );
    }

    renderListExpansion() {
        if (this.state.areAllExpanded) {
            return (
                <div
                    className="icon"
                    onClick={() => this.setState({ isExpanded: {} })}
                >
                    <TiMinus />
                </div>
            );
        }
        return (
            <div
                className="icon"
                onClick={() => this.setState((state) => ({
                    isExpanded: Object.fromEntries(
                        state.items.map((item) => [item.id, true]),
                    ),
                }))}
            >
                <TiPlus />
            </div>
        );
    }

    renderItems() {
        const { ViewerComponent } = this.props;
        return this.state.items.map((item) => (
            <BulletListItem
                key={item.id}
                isExpanded={this.state.isExpanded[item.id]}
                onToggleExpansion={() => this.toggleItem(item)}
                onEditButtonClick={() => this.editItem(item)}
                onDeleteButtonClick={() => this.deleteItem(item)}
            >
                <ViewerComponent value={item} isExpanded={false} />
                {
                    // eslint-disable-next-line react/forbid-foreign-prop-types
                    ViewerComponent.propTypes.isExpanded
                        ? <ViewerComponent value={item} isExpanded />
                        : null
                }
            </BulletListItem>
        ));
    }

    renderAdder() {
        const { AdderComponent } = this.props;
        if (!AdderComponent) {
            return null;
        }
        return (
            <BulletListAdder>
                <AdderComponent
                    onEdit={(item) => this.editItem(item)}
                    onSave={(item) => this.saveItem(item)}
                />
            </BulletListAdder>
        );
    }

    render() {
        if (!this.state.items) {
            return <div>Loading ...</div>;
        }
        return (
            <div>
                {this.renderEditorModal()}
                <InputGroup>
                    <div className="mr-1">
                        {this.props.name}
                    </div>
                    {this.renderListExpansion()}
                </InputGroup>
                {this.renderItems()}
                {this.renderAdder()}
            </div>
        );
    }
}

BulletList.propTypes = {
    name: PropTypes.string.isRequired,
    dataType: PropTypes.string.isRequired,
    EditorComponent: PropTypes.func.isRequired,
    ViewerComponent: PropTypes.func.isRequired,
    AdderComponent: PropTypes.func,
};

export default BulletList;