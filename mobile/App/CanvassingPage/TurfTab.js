import React from 'react';

import { View } from 'react-native';

import {
  Content, Body, Right, Text, Button, List, ListItem, Spinner, Segment,
} from 'native-base';
import Icon from 'react-native-vector-icons/FontAwesome';
import { geojson2polygons } from 'ourvoiceusa-sdk-js';
import TimeAgo from 'javascript-time-ago';

import { say } from '../common';

export default ListTab = props => {
  const { segmentTurf } = props.refer.state;

  return (
    <View>
      <Segment>
        <Button first active={(segmentTurf==='list')} onPress={() => props.refer.setState({segmentTurf: 'list'})}><Text>List</Text></Button>
        <Button last active={(segmentTurf==='info')} onPress={() => props.refer.setState({segmentTurf: 'info'})}><Text>Info</Text></Button>
      </Segment>
      <SegmentList refer={props.refer} />
      <SegmentInfo refer={props.refer} />
    </View>
  );
}

var reA = /[^a-zA-Z]/g;
var reN = /[^0-9]/g;

function sortAlphaNum(ao, bo) {
  let a = ao.name;
  let b = bo.name;

  let aA = a.replace(reA, "");
  let bA = b.replace(reA, "");
  if (aA === bA) {
    let aN = parseInt(a.replace(reN, ""), 10);
    let bN = parseInt(b.replace(reN, ""), 10);
    return aN === bN ? 0 : aN > bN ? 1 : -1;
  } else {
    return aA > bA ? 1 : -1;
  }
}

const SegmentList = props => {
  let rstate = props.refer.state;
  if (rstate.segmentTurf!=='list') return null;

  return (
    <List>
    {rstate.turfs.sort(sortAlphaNum).map(t => (
      <ListItem icon onPress={() => props.refer.setState({selectedTurf: t}, () => props.refer._loadturfInfo())}>
        <Body><Text>{t.name}</Text></Body>
        <Right>
          <Icon name="angle-double-right" size={25} />
        </Right>
      </ListItem>
    ))}
    </List>
  );
};

function polygonCenter(obj) {
  let arr = obj.map(o => [o.lng,o.lat]);
  var x = arr.map (x => x[0]);
  var y = arr.map (x => x[1]);
  var cx = (Math.min (...x) + Math.max (...x)) / 2;
  var cy = (Math.min (...y) + Math.max (...y)) / 2;
  return [cx, cy];
}

function statVal(val) {
  if (!val) return 'N/A';
  if (Number.isInteger(val) && val > 1000000000000) return new TimeAgo().format(val);
  return val;
}

const SegmentInfo = props => {
  let rstate = props.refer.state;
  if (rstate.segmentTurf!=='info') return null;

  if (!rstate.fetchingturfInfo && Object.keys(rstate.turfInfo).length === 0)
    return (<Text>No turf selected.</Text>);

  return (
    <View>
      {rstate.fetchingturfInfo&&
      <Spinner />
      ||
      <List>
        <ListItem itemDivider icon onPress={() => {
          let c = polygonCenter(geojson2polygons(JSON.parse(rstate.turfInfo.geometry))[0]);
          props.refer.setState({selectedTurf: rstate.turfInfo});
          props.refer.animateToCoordinate({longitude: c[0], latitude: c[1]});
        }}>
          <Body>
            <Text>{rstate.turfInfo.name}</Text>
          </Body>
          <Right>
            <Icon name="compass" size={25} />
          </Right>
        </ListItem>
        {Object.keys(rstate.turfInfo.stats).map((key) => {
          val = rstate.turfInfo.stats[key];
          if (!val || typeof val !== 'object')
            return (<ListItem><Text>{key}: {statVal(val)}</Text></ListItem>);
          else {
            if (val && typeof val === 'object')
              return Object.keys(val).map((i) => (
                  <View>
                    <ListItem itemDivider>
                      <Text>{i}</Text>
                    </ListItem>
                    {val[i] && typeof val[i] === 'object' && Object.keys(val[i]).map((k) => {
                      v = val[i][k];
                      return (<ListItem><Text>{k}: {v}</Text></ListItem>);
                    })}
                  </View>
              ));
            else return null;
          }
        })}
      </List>
      }
    </View>
  );
};
