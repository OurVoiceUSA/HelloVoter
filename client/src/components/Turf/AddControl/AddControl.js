import React, { Component } from 'react';

//packages
import { TextField } from '@material-ui/core';
import { us_states } from 'ourvoiceusa-sdk-js';
import circleToPolygon from 'circle-to-polygon';
import { _fetch,
  notify_error,
  notify_success,
  PlacesAutocomplete } from '../../../common';

//Custom Components
import TurfVerticalStepper from '../TurfVerticalStepper/TurfVerticalStepper';
import StepSelect from '../StepSelect/StepSelect';
  
/**
 * This will be an overall control of the stepper possible layouts.  A middle state
 * will be managed and passed back to Turf to create the turf.
 */
class AddControl extends Component {
  constructor(props) {
    super(props);

    //load in the state data from ourvoice package
    this.state.stateOptions = [];
    Object.keys(us_states).map(k =>
        this.state.stateOptions.push({ value: k, label: us_states[k].name })
    );

  }

  //state setup.  steps and method determine the default common path
  state = {
    turfName: '',
    turfDistrictType: '', 
    turfDistrictNumber: '',
    turfRegion: '',
    steps: ['Confirm Turf Method','Enter Turf Name','Select State or Region','Select District Type','Select District Number'],
    method: 'select',
    typeOptions: [],
    districtOptions: [],
    districtOptionsType: '',
    districtOptionsRegion: '',
    drawOptions : [
      { value: 'select', label: 'Select from legislative boundary' },
      { value: 'import', label: 'Import GeoJSON shape file' },
      //{ value: 'radius', label: 'Area surrounding an address' },
      { value: 'draw', label: 'Manually draw with your mouse' }
    ]
  }

  //All handlers
  //Handle the Input (Turf Name) entry
  turfNameHandler = (name) => {
    this.setState({turfName : name});
  };

  //Handler of the add turf method dropdown
  //if changed to something other than 'select'
  //need to change the content sent to the stepper.
  methodChangeHandler = (event) => {
    this.setState({method: event.target.value});
    this.setState({steps : this.methodSteps(event.target.value)});
  };

  //React hook
  componentDidUpdate() {
    //after selecting district type, need to build district numbers
    if(this.state.turfDistrictType !== '') {
      if((this.state.turfDistrictType !== this.state.districtOptionsType) ||
        (this.state.districtOptionsRegion !== '' && 
          this.state.turfRegion !== this.state.districtOptionsRegion)) {
        this.districtNumberFetchHandler();

        console.log("Updated", this.state.districtOptions);
      }
    }
  }

  // componentWillUpdate() {
  //   console.log('[ComponentWillUpdate]');
  // }

  // componentWillMount() {
  //   console.log('[ComponentWillMount]');
  // }

  // componentDidMount() {
    //console.log('[ComponentDidMount]')
   // console.log('The state: ', this.state.configs);
  // }

  //Handle change of the State or Region dropdown
  //also, needs to setup district type options after region selection
  regionChangeHandler = (event) => {
    this.setState({turfRegion : event.target.value});
    this.typeOptionsHandler(event.target.value);
  };

  //handler to setup district type options
  typeOptionsHandler = (region) => {
    this.setState({typeOptions: [
      { value: 'state', label: 'State' },
      { value: 'cd', label: 'Congressional' },
      { value: 'sldu', label: us_states[region].sldu },
      { value: 'sldl', label: us_states[region].sldl },
    ]});
  };

  turfDistrictTypeHandler = (event) => {
    this.setState({turfDistrictType : event.target.value});
  }

  turfDistrictNumberHandler = (event) => {
    this.setState({turfDistrictNumber : event.target.value});
  }

  //Handler to setup the fecth to github pages as well as set
  //the district number options state
  districtNumberFetchHandler = () => {
    this.setState({districtOptionsType : this.state.turfDistrictType});
    this.setState({districtOptionsRegion: this.state.turfRegion});
    
    let uri = '';
    
    switch (this.state.turfDistrictType) {
      case 'cd':
        // TODO: handle the fact there are new years with less in them
        uri = 'cds/2016/';
        break;
      case 'sldu':
        uri = 'states/' + this.state.turfRegion + '/sldu/';
        break;
      case 'sldl':
        uri = 'states/' + this.state.turfRegion + '/sldl/';
        break;
      default:
        return;
    }
    
    fetch('https://api.github.com/repos/OurVoiceUSA/districts/contents/' + uri)
      .then(res => res.json())
      .then(objs => {
        const dist = [{ value: 'all', label: 'Create all of them!' }];
        console.log('Fecth:',objs);
        switch (this.state.turfDistrictType) {
          case 'cd':
            objs.forEach(o => {
              if (o.name.includes(this.state.turfRegion))
                dist.push({ value: o.name, label: o.name });
              return;
            });
            break;
          default:
            objs.forEach(o => {
              let val = o.name.replace('.geojson', '');
              dist.push({ value: val, label: val });
            });
          }
      
          this.setState({ districtOptions: dist });
          console.log("Updated the numbers options:",dist,this.state.districtOptions);
      })
      .catch(error => console.log(error))
  }

  //need a method to return the steps per method
  methodSteps = (method) => {
    const stepsByMethod = {
      select : ['Confirm Turf Method','Enter Turf Name','Select State or Region','Select District Type','Select District Number'],
      import : ['Confirm Turf Method','Enter Turf Name','Import GeoJSON'],
      //radius : ['Confirm Turf Method','Enter Turf Name','Select Radius'],
      draw : ['Confirm Turf Method','Enter Turf Name','Draw Boundary Manually']
    };

    console.log('[MethodSteps -]' + method + ': ',stepsByMethod[method]);
    return stepsByMethod[method];
  };

  urlFromDist(state, type, value) {
    let uri;

    switch (type) {
    case 'state':
      uri = 'states/' + state + '/shape.geojson';
      break;
    case 'cd':
      // TODO: handle the fact there are new years with less in them
      uri = 'cds/2016/' + value + '/shape.geojson';
      break;
    case 'sldu':
      uri = 'states/' + state + '/sldu/' + value + '.geojson';
      break;
    case 'sldl':
      uri = 'states/' + state + '/sldl/' + value + '.geojson';
      break;
    default:
      throw new Error('unknown selectedTypeOption');
    }

    return (
      'https://raw.githubusercontent.com/OurVoiceUSA/districts/gh-pages/' + uri
    );
  }

  //method to setup data needed for calling the turf
  createTurf = () => {
    console.log('[Create Turf]');
    console.log('[URL Gen: ]',
      this.urlFromDist(this.state.turfRegion,this.state.turfDistrictType,this.state.turfDistrictNumber));
    
      //looks like object needed from top level.
      const { global } = this.props.global;

      //let json = this.addTurfForm.getValue();
      //if (json === null) return;
  
      //this.setState({ saving: true });
  
      let objs = [];
  
      if (this.state.method === 'import' && this.state.importFileData !== null) {
        try {
          objs.push(JSON.parse(this.state.importFileData));
        } catch (e) {
          notify_error(e, 'Unable to parse import data file.');
          return this.setState({ saving: false });
        }
      } else if (this.state.method === 'radius') {
        objs.push(
          circleToPolygon(
            [this.state.addressCoords.lng, this.state.addressCoords.lat],
            1000
          )
        );
      } else {
        
        try {
         
          if (
            this.state.turfDistrictNumber &&
            this.state.turfDistrictNumber === 'all'
          ) {
            
            for (let i in this.state.districtOptions) {
              if (this.state.districtOptions[i].value === 'all') continue;
              fetch(
                this.urlFromDist(this.state.turfRegion,
                    this.state.turfDistrictType,
                    this.state.turfDistrictNumber
                  )
              ).then(res => res.json())
              .then(response => {
                let obj = response;
                obj.name = this.state.districtOptions[i].value;
                objs.push(obj);
              })
              //.catch(error => console.log(error))
            }
          } else {
            //this.loadData().then(data => objs.push(data));
            this.loadData().then(async (res,rej) => {
              objs.push(res);
              console.log('[Res] - ',res);
              //console.log('This is where the code should go.');
              for (let i in objs) {
                console.log('[Inside for i in objs]',objs[i]);
                let obj = objs[i];
                let geometry;
                let name;
        
                if (obj.geometry) geometry = obj.geometry;
                else geometry = obj;
        
                if (this.state.turfDistrictNumber &&
                    this.state.turfDistrictNumber === 'all'
                  )
                  name = this.state.turfName + ' ' + obj.name;
                else name = this.state.turfName;
        
                console.log('[Post turf]',name, geometry);
      
                await _fetch(global, '/turf/create', 'POST', {
                  name: name,
                  geometry: geometry,
                });
              }
              notify_success('Turf has been created.');
            // } catch (e) {
            //   notify_error(e, 'Unable to create turf.');
            // }
      
            //this.setState({ saving: false });
        
            window.location.href = '/HelloVoterHQ/#/turf/';
            this.props.loadData();
            
            console.log('[Added turf]',this.state.turfName);
            });

          }
        } catch (e) {
          notify_error(e, 'Unable to fetch district info data.');
          return this.setState({ saving: false });
        }
      }  
  };

  loadData = async () => {
    let resp = await fetch(this.urlFromDist(this.state.turfRegion,
          this.state.turfDistrictType,
          this.state.turfDistrictNumber ? this.state.turfDistrictNumber : null
        )
    );

    let data = await resp.json();
    
    return data;
    // .then(res => res.json())
    // .then(response => {
    //   objs.push(response);
    // })
    //.catch(error => console.log(error))
  };

  postData = async () => {
    
  };

  //this validates the current step and if the Next button should be disabled
  //currently doesn't validate third step of import or draw
  disableNextButton = (activeStep) => {

    if(this.state.method === 'select') {
      if (activeStep === 1 && (this.state.turfName === null || this.state.turfName === '')) {
        return true;
      } else if (activeStep === 2 && this.state.turfRegion === '') {
        return true;
      } else if (activeStep === 3 && this.state.turfDistrictType === '') {
        return true;
      } else if (activeStep === 4 && this.state.turfDistrictNumber === '') {
        return true;
      } else {
        return false;
      }
    } else if(this.state.method === 'import') {
      if (activeStep === 1 && (this.state.turfName === null || this.state.turfName === ''))
        return true;
    } else if(this.state.method === 'draw') {
      if (activeStep === 1 && (this.state.turfName === null || this.state.turfName === ''))
        return true;
    } else {
      return false;
    }
  }

  //this method setups the rendering in each step depending on the method selected
  stepContent = (step, id) => {

    if('select' === id) {
      switch (step) {
        case 0:
            return <StepSelect 
                    id='select'
                    label= 'Confirm turf adding method.'
                    value= {this.state.method}
                    change= {this.methodChangeHandler}
                    options= {this.state.drawOptions}
                  />
        case 1:
          return <TextField 
                    onChange={e => {this.turfNameHandler(e.target.value)}}
                    value={this.state.turfName}
                />
        case 2: 
            return <StepSelect 
                    id='region'
                    label= 'Select state or region containing turf.'
                    value= {this.state.turfRegion}
                    change= {this.regionChangeHandler}
                    options= {this.state.stateOptions}
                  />
        case 3:
            return <StepSelect 
                    id='type'
                    label= 'District type of state or region.'
                    value= {this.state.turfDistrictType}
                    change= {this.turfDistrictTypeHandler}
                    options= {this.state.typeOptions}
                  />
        case 4:
            return <StepSelect 
                    id='number'
                    label= 'District number.'
                    value= {this.state.turfDistrictNumber}
                    change= {this.turfDistrictNumberHandler}
                    options= {this.state.districtOptions}
                  />
        default:
          return 'Unknown step';
      }
    }  //end of if('select')
    else if(id === 'import') {
      switch (step) {
        case 0:
            return <StepSelect 
                    id='select'
                    label= 'Confirm turf adding method.'
                    value= {this.state.method}
                    change= {this.methodChangeHandler}
                    options= {this.state.drawOptions}
                  />
        case 1:
          return <TextField 
                    onChange={e => {this.turfNameHandler(e.target.value)}}
                    value={this.state.turfName}
                />
        case 2: 
            return (
              <div>
                <br />
                <input
                  type="file"
                  accept=".geojson,.json"
                  //onChange={e => this.props.refer.handleImportFiles(e.target.files)}
                />
              </div>
            );
        default:
          return 'Unknown step';
      }
    } //end of else if (import)
    else if(id === 'radius') {
      switch (step) {
        case 0:
            return <StepSelect 
                    id='select'
                    label= 'Confirm turf adding method.'
                    value= {this.state.method}
                    change= {this.methodChangeHandler}
                    options= {this.state.drawOptions}
                  />
        case 1:
          return <TextField 
                    onChange={e => {this.turfNameHandler(e.target.value)}}
                    value={this.state.turfName}
                />
        case 2: 
            return (
              <div>
                <br />
                  Type the address:
                <PlacesAutocomplete
                  debounce={500}
                  value={this.props.refer.state.address}
                  onChange={this.props.refer.onTypeAddress}
                  onSelect={this.props.refer.submitAddress}
                />
              </div>
            );
        default:
          return 'Unknown step';
      }
    }  //end of else if(radius)
    else if(id === 'draw') {
      switch (step) {
        case 0:
            return <StepSelect 
                    id='select'
                    label= 'Confirm turf adding method.'
                    value= {this.state.method}
                    change= {this.methodChangeHandler}
                    options= {this.state.drawOptions}
                  />
        case 1:
          return <TextField 
                    onChange={e => {this.turfNameHandler(e.target.value)}}
                    value={this.state.turfName}
                />
        case 2: 
            return (<div>
            <br />
              Use a{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://google-developers.appspot.com/maps/documentation/utils/geojson/"
            >
                GeoJSON Draw Tool
            </a>
              , save the file, and then select the "Import GeoJSON shape file"
              option.
          </div>
        );
        default:
          return 'Unknown step';
      }
    }//end of else if(draw)
  }

  render() {
      return (
          <TurfVerticalStepper 
              id={this.state.method}
              steps={this.state.steps} 
              stepContent={this.stepContent}
              createTurf={this.createTurf}
              disableBtn={this.disableNextButton}
          />
      );
  }
}

export default AddControl;