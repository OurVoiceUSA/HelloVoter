import React, { Component } from 'react';

import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const grid = 8;

const getItemStyle = (isDragging, draggableStyle) => ({
    // some basic styles to make the items look a bit nicer
    userSelect: 'none',
    padding: grid * 2,
    margin: `0 0 ${grid}px 0`,

    // change background colour if dragging
    background: isDragging ? 'lightgreen' : 'grey',

    // styles we need to apply on draggables
    ...draggableStyle
});

const getListStyle = isDraggingOver => ({
    background: isDraggingOver ? 'lightblue' : 'lightgrey',
    padding: grid,
    width: 250
});

function inputTypeToReadable(type) {
  switch (type) {
  case 'String':
    return 'Text Input';
  case 'TEXTBOX':
    return 'Text Box';
  case 'Number':
    return 'Number';
  case 'Boolean':
    return 'On/Off Switch';
  case 'SAND':
    return 'Agree/Disagree';
  case 'List':
    return 'Select from List';
  default:
    return type;
  }
}

// a little function to help us with reordering the result
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

/**
 * Moves an item from one list to another list.
 */
const move = (source, destination, droppableSource, droppableDestination) => {
  const sourceClone = Array.from(source);
  const destClone = Array.from(destination);
  const [removed] = sourceClone.splice(droppableSource.index, 1);

  destClone.splice(droppableDestination.index, 0, removed);

  const result = {};
  result[droppableSource.droppableId] = sourceClone;
  result[droppableDestination.droppableId] = destClone;

  return result;
};

export default class FormEditor extends Component {
  constructor(props) {
    super(props);

    let perPage = localStorage.getItem('formsperpage');
    if (!perPage) perPage = 5;

    // TODO: this is only for brand new forms
    let fields = {};
    let order = Object.keys(fields);

    this.state = {
      onChange: props.onChange,
      attributes: [],
      attributes_selected: props.selected,
    };

    // any attributes not selected go in attributes
    props.attributes.forEach(attribute => {
      if (this.state.attributes_selected.map(a => a.id).indexOf(attribute.id) === -1) this.state.attributes.push(attribute);
    });

    this.id2List = {
      droppable: 'attributes',
      droppable2: 'attributes_selected',
    };

  }

  getList = id => this.state[this.id2List[id]];

  onDragEnd = result => {
    const { onChange } = this.state;
    const { source, destination } = result;

    // dropped outside the list
    if (!destination) {
      return;
    }

    if (source.droppableId === destination.droppableId) {
      const attributes = reorder(
        this.getList(source.droppableId),
        source.index,
        destination.index
      );

      let state = { attributes };

      if (source.droppableId === 'droppable2') {
        state = { attributes_selected: attributes };
      }

      this.setState(state, () => onChange(this.state));
    } else {
      const result = move(
        this.getList(source.droppableId),
        this.getList(destination.droppableId),
        source,
        destination
      );

      this.setState({
        attributes: result.droppable,
        attributes_selected: result.droppable2
      }, () => onChange(this.state));
    }
  };

  render() {
    const { refer, attributes, attributes_selected } = this.state;

    return (
      <div style={{display: 'flex', flexDirection: 'row'}}>
        <DragDropContext onDragEnd={this.onDragEnd}>
          <AttributeDroppable label="Available Attributes" droppableId="droppable" attributes={attributes} />
          &nbsp;
          Drag to assign
          &nbsp;
          <AttributeDroppable label="Attributes on this Form" droppableId="droppable2" attributes={attributes_selected} />
        </DragDropContext>
      </div>
    );
  }
}

const AttributeDroppable = props => (
  <Droppable droppableId={props.droppableId}>
      {(provided, snapshot) => (
          <div
              ref={provided.innerRef}
              style={getListStyle(snapshot.isDraggingOver)}>
              {props.label}
              {props.attributes.map((item, index) => (
                  <Draggable
                      key={item.id}
                      draggableId={item.id}
                      index={index}>
                      {(provided, snapshot) => (
                          <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={getItemStyle(
                                  snapshot.isDragging,
                                  provided.draggableProps.style
                              )}>
                              {item.label + (item.required ? ' *' : '')} :{' '}
                              {inputTypeToReadable(item.type)}{' '}
                          </div>
                      )}
                  </Draggable>
              ))}
              {provided.placeholder}
          </div>
      )}
  </Droppable>
);
