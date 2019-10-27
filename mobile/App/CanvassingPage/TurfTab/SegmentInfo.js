import React from 'react';
import { View } from 'react-native';
import { Body, Right, Left, Text, List, ListItem, Spinner } from 'native-base';

import Icon from 'react-native-vector-icons/FontAwesome';
import { geojson2polygons } from 'ourvoiceusa-sdk-js';

import { say, timeAgo } from '../../common';

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
  if (Number.isInteger(val)) {
    if (val > 1000000000000) return timeAgo(val);
    else return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }
  return val;
}

export default SegmentInfo = props => {
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
        <ListItem key="first" itemDivider icon onPress={() => {
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
            return (
              <ListItem key={"statval"+key}>
                <Left><Text>{key}:</Text></Left>
                <View><Text>{statVal(val)}</Text></View>
              </ListItem>);
          else {
            if (val && typeof val === 'object')
              return Object.keys(val).map((i) => (
                  <View key={i}>
                    <ListItem itemDivider>
                      <Text>{i}</Text>
                    </ListItem>
                    {val[i] && typeof val[i] === 'object' && Object.keys(val[i]).map((k) => {
                      v = val[i][k];
                      return (
                        <ListItem key={k}>
                          <Left><Text>{k}:</Text></Left>
                          <View><Text>{statVal(v)}</Text></View>
                        </ListItem>
                      );
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
