import React, { useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import StepContent from '@material-ui/core/StepContent';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { TextField } from '@material-ui/core';

import Select from 'react-select';
import { us_states } from 'ourvoiceusa-sdk-js';

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
  },
  button: {
    marginTop: theme.spacing(1),
    marginRight: theme.spacing(1),
  },
  actionsContainer: {
    marginBottom: theme.spacing(2),
  },
  resetContainer: {
    padding: theme.spacing(3),
  },
}));

const stateOptions = [];
Object.keys(us_states).map(k =>
  stateOptions.push({ value: k, label: us_states[k].name })
);

function getSteps() {
  return ['Enter Turf Name', 'Confirm Turf Method','Select State or Region','Select District Type','Select District Number'];
}

//gets the JSX for each step
function selectJsx(label,props,defaultValue,searchable,options, changed) {
  //console.log(label, defaultValue, props);

  return <section>
    {label}
    <Select 
      value={defaultValue ? defaultValue : props.selectedDrawOption}
      onChange={changed}
      options={options}
      isSearchable={searchable}
      //defaultValue = {defaultValue}
      //placeholder="Select method"
    />
    </section>;
}

function getStepContent(step,props) {

  switch (step) {
    case 0:
      return <TextField 
                //id={props.inputRef} 
                label="Turf Name" 
                onChange={props.changed}
                value={props.inputRef}
              />
    case 1:
      return selectJsx('Method of generating turf:',props, {label: props.drawOptions[0].label, value: 'select'},false,props.drawOptions,props.handleDrawChange);
    case 2:
      return selectJsx('State or region:',props, null, true,stateOptions,props.handleStateChange );
    case 3:
      return "Need to fill";
    case 4:
      return "Need to fill also";
    default:
      return 'Unknown step';
  }
}

/*
 State or region:
            <Select
              value={this.props.refer.state.selectedStateOption}
              onChange={this.handleStateChange}
              options={stateOptions}
              isSearchable={true}
              placeholder="Select state or region"
            />
*/

export default function TurfVerticalStepper(props) {
  const classes = useStyles();
  const [activeStep, setActiveStep] = React.useState(0);
  //const []
  //const steps = getSteps();
  const [steps, setSteps] = React.useState(
    getSteps()
  );

  //const [turfName, setTurfName] = React.useState("");

  const handleNext = () => {
    setActiveStep(prevActiveStep => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep(prevActiveStep => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setSteps(getSteps());
  };

  // React.useEffect(() => {
  //   if (activeStep === 1) {
  //     console.log("Use Effect - Do something");
  //     setSteps(['Enter Turf Name', 'Select Turf Method','Select State or Region','Select District Type','Select District Number']);
  //   }
  // },[activeStep]);

  return (
    <div className={classes.root}>
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((label, index) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
            <StepContent>
              <Typography>{getStepContent(index,props)}</Typography>
              <div className={classes.actionsContainer}>
                <div>
                  <Button
                    disabled={activeStep === 0}
                    onClick={handleBack}
                    className={classes.button}
                  >
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleNext}
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
      {activeStep === steps.length && (
        <Paper square elevation={0} className={classes.resetContainer}>
          <Typography>All steps completed - you&apos;re finished</Typography>
          <Button onClick={handleReset} className={classes.button}>
            Reset
          </Button>
        </Paper>
      )}
    </div>
  );
}