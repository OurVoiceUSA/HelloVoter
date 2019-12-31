import React from 'react';

//packages
import { Select, MenuItem} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import FormControl from '@material-ui/core/FormControl';

const useStyles = makeStyles(theme => ({
    formControl: {
      margin: theme.spacing(1),
      minWidth: 120,
    },
    selectEmpty: {
      marginTop: theme.spacing(2),
    },
}));

export default function StepSelect(props) {

    //used for material-ui select
    const renderOptions = (options) => {
        return options.map((item, i) => {
            return (
                  <MenuItem
                  value={item.value}
                  key={i} name={item.label}>{item.label}</MenuItem>
            );
        });
      }
  
    //generate a material-ui select for the stepper
    return (
        <div>
        <p>{props.label}</p>
            <FormControl className={useStyles().formControl}>
            <Select 
                value={props.value ? props.value : props.defaultValue} 
                onChange={props.change}
            >{renderOptions(props.options)}
            </Select>    
            </FormControl>  
        </div>
    );
}