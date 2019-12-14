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

export const FormEditor = props => (
  <div style={{display: 'flex', flexDirection: 'row'}}>
    <DragDropContext onDragEnd={props.refer.onDragEnd}>
      <AttributeDroppable refer={props.refer} label="Available Attributes" droppableId="droppable" attributes={props.refer.state.attributes} />
      &nbsp;
      Drag to assign
      &nbsp;
      <AttributeDroppable refer={props.refer} label="Attributes on this Form" droppableId="droppable2" attributes={props.refer.state.attributes_selected} />
    </DragDropContext>
  </div>
);

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
          </div>
      )}
  </Droppable>
);
