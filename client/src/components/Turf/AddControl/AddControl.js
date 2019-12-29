import React, { Component } from 'react';

//packages
import { TextField } from '@material-ui/core';
import { Select, MenuItem} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import FormControl from '@material-ui/core/FormControl';
import { us_states } from 'ourvoiceusa-sdk-js';

//Custom Components
import TurfVerticalStepper from '../TurfVerticalStepper/TurfVerticalStepper';

const useStyles = makeStyles(theme => ({
    formControl: {
      margin: theme.spacing(1),
      minWidth: 120,
    },
    selectEmpty: {
      marginTop: theme.spacing(2),
    },
  }));
  
/**
 * This will be an overall control of the stepper possible layouts.  A middle state
 * will be managed and passed back to Turf to create the turf.
 */
class AddControl extends Component {
  constructor(props) {
    super(props);

    //console.log('[Constructor]');
    //this.state.configs = [];
    this.state.configs = this.initializeSelectConfigs();
    //console.log('[constructor] - config',this.state.configs);
  }

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
   // this.setState({steps : this.methodSteps(event.target.value)});
  };

  //React hook
  componentDidUpdate() {
    //after selecting district type, need to build district numbers
    if(this.state.turfDistrictType !== '') {
      if((this.state.turfDistrictType !== this.state.districtOptionsType) ||
        (this.state.districtOptionsRegion !== '' && 
          this.state.turfRegion !== this.state.districtOptionsRegion)) {
        this.districtNumberFetchHandler();

        console.log("Updated");
        console.log(this.state.districtOptions);
      }
    }
  }

  // componentWillUpdate() {
  //   console.log('[ComponentWillUpdate]');
  // }

  // componentWillMount() {
  //   console.log('[ComponentWillMount]');
  // }

  componentDidMount() {
    //console.log('[ComponentDidMount]')
   // console.log('The state: ', this.state.configs);
  }

  //Handle change of the State or Region dropdown
  //also, needs to setup district type options after region selection
  regionChangeHandler = (event) => {
    this.setState({turfRegion : event.target.value});
    this.typeOptionsHandler(event.target.value);
    //this.setState({configs: this.initializeSelectConfigs()});
    //console.log(this.state.configs);
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
      radius : ['Confirm Turf Method','Enter Turf Name','Select Radius'],
      draw : ['Confirm Turf Method','Enter Turf Name','Draw Boundary Manually']
    };

    console.log('[MethodSteps -]' + method + ': ',stepsByMethod[method]);
    return stepsByMethod[method];
  };


  //This will setup the JSX for the dropdowns in selects on the happy path
  initializeSelectConfigs = () => {
    //console.log(this.methodSteps(this.state.method));
    const drawOptions = [
        { value: 'select', label: 'Select from legislative boundary' },
        { value: 'import', label: 'Import GeoJSON shape file' },
        { value: 'radius', label: 'Area surrounding an address' },
        { value: 'draw', label: 'Manually draw with your mouse' },
      ];

    const stateOptions = [];
    Object.keys(us_states).map(k =>
        stateOptions.push({ value: k, label: us_states[k].name })
    );

    const configs = [];
    configs.push({
        id: 'select',
        label: 'Confirm turf adding method.',
        value: this.state.method,
        change: this.methodChangeHandler,
        options: drawOptions,
    });

    configs.push({
        id: 'region',
        label: 'Select state or region containing turf.',
        value: this.state.turfRegion,
        change: this.regionChangeHandler,
        options: stateOptions,
    });

    configs.push({
        id: 'type',
        label: 'District type of state or region.',
        value: this.state.turfDistrictType,
        change: this.turfDistrictTypeHandler,
        options: this.state.typeOptions
    });

    configs.push({
        id: 'number',
        label: 'District number.',
        value: this.state.turfDistrictNumber,
        change: this.turfDistrictNumberHandler,
        options: this.state.districtOptions
    });

      return configs;
    };

    //used for material-ui select
    renderOptions(options) {
      return options.map((item, i) => {
          return (
                <MenuItem
                value={item.value}
                key={i} name={item.label}>{item.label}</MenuItem>
          );
      });
    }

    //generate a material-ui select for the stepper
    setupSelect = (config) => {
      return (
          <div>
          <p>{config.label}</p>
            <FormControl className={useStyles().formControl}>
              <Select 
                  value={config.value ? config.value : config.defaultValue} 
                  onChange={config.change}
              >{this.renderOptions(config.options)}
              </Select>    
            </FormControl>  
          </div>
      );
    };

    stepContent = (step) => {
      //console.log('[stepContent] Configs:',this.state.configs);

      switch (step) {

        case 0:
            return this.setupSelect(this.state.configs.find(
                o => o.id === 'select'
            ));
        case 1:
          return <TextField 
                    onChange={e => {this.turfNameHandler(e.target.value)}}
                    value={this.state.turfName}
                />
        case 2: 
          return this.setupSelect(this.state.configs.find(
            o => o.id === 'region'
        ));
        case 3:
          return this.setupSelect(this.initializeSelectConfigs().find(
            o => o.id === 'type'
        ));
        case 4:
          return this.setupSelect(this.initializeSelectConfigs().find(
            o => o.id === 'number'
        ));
        default:
          return 'Unknown step';
      }
    }

    render() {
        return (
            <TurfVerticalStepper 
                steps={this.state.steps} 
                stepContent={this.stepContent}
            />
        );
    }
}

export default AddControl;