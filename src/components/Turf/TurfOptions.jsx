import React, { Component } from 'react';

import Select from 'react-select';

import CircularProgress from '@material-ui/core/CircularProgress';
import { withStyles } from '@material-ui/core/styles';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import StepContent from '@material-ui/core/StepContent';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';

import { us_states } from 'ourvoiceusa-sdk-js';

import {
  PlacesAutocomplete,
} from '../../common.js';

const styles = theme => ({
  root: {
    width: '90%',
  },
  button: {
    marginTop: theme.spacing.unit,
    marginRight: theme.spacing.unit,
  },
  actionsContainer: {
    marginBottom: theme.spacing.unit * 2,
  },
  resetContainer: {
    padding: theme.spacing.unit * 3,
  },
});

class TurfOptions extends Component {
  state = {
    activeStep: 0,
  };

  handleStateChange = selectedStateOption => {
    this.setState({
      typeOptions: [
        { value: 'state', label: 'State' },
        { value: 'cd', label: 'Congressional' },
        { value: 'sldu', label: us_states[selectedStateOption.value].sldu },
        { value: 'sldl', label: us_states[selectedStateOption.value].sldl },
      ],
    });
    this.props.refer.handleStateChange(selectedStateOption);
  }

  handleNext = () => {
    this.setState(state => ({
      activeStep: state.activeStep + 1,
    }));
  };

  handleBack = () => {
    this.setState(state => ({
      activeStep: state.activeStep - 1,
    }));
  };

  handleReset = () => {
    this.setState({
      activeStep: 0,
    });
  };

  render() {
    const { classes } = this.props;
    const { activeStep } = this.state;

    const steps = ['Select campaign settings', 'Create an ad group', 'Create an ad'];

    if (!this.props.refer.state.selectedDrawOption) return <br />;

    let stateOptions = [];
    Object.keys(us_states).map(k =>
      stateOptions.push({ value: k, label: us_states[k].name })
    );

    switch (this.props.refer.state.selectedDrawOption.value) {
    case 'select':
      return (
        <div className={classes.root}>
          <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
              <StepContent>
                <Typography>{index}</Typography>
                <div className={classes.actionsContainer}>
                  <div>
                    <Button
                      disabled={activeStep === 0}
                      onClick={this.handleBack}
                      className={classes.button}
                    >
                      Back
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={this.handleNext}
                      className={classes.button}
                    >
                      {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
                    </Button>
                  </div>
                </div>
              </StepContent>
            </Step>
          ))}
          </Stepper>
        </div>
      );
      /*
      <div>
        <div>
          <br />
            State or region:
          <Select
            value={this.props.refer.state.selectedStateOption}
            onChange={this.handleStateChange}
            options={stateOptions}
            isSearchable={true}
            placeholder="Select state or region"
          />
        </div>
        {this.props.refer.state.selectedStateOption ? (
          <div>
            <br />
              District Type:
            <Select
              value={this.props.refer.state.selectedTypeOption}
              onChange={this.props.refer.handleTypeChange}
              onMenuClose={this.props.refer.selectedTypeFetch}
              options={this.state.typeOptions}
              isSearchable={false}
              placeholder="Select district for this turf"
            />
          </div>
        ) : (
          ''
        )}

        {this.props.refer._showDistrictOption() ? (
          <div>
            <br />
              District Number:
            {this.props.refer.state.districtOptions.length ? (
              <Select
                value={this.props.refer.state.selectedDistrictOption}
                onChange={this.props.refer.handleDistrictChange}
                options={this.props.refer.state.districtOptions}
                isSearchable={true}
                placeholder="Select district for this turf"
              />
            ) : (
              <CircularProgress />
            )}
          </div>
        ) : (
          ''
        )}
      </div>
      */
    case 'import':
      return (
        <div>
          <br />
          <input
            type="file"
            accept=".geojson,.json"
            onChange={e => this.props.refer.handleImportFiles(e.target.files)}
          />
        </div>
      );
    case 'radius':
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
    case 'draw':
      return (
        <div>
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
      return <div>Unknown generation method.</div>;
    }
  }
}

export default withStyles(styles)(TurfOptions);
