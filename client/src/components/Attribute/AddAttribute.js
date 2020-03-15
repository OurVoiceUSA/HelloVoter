import React, {useState} from 'react';

import { Checkbox, Select, FormControl,FormControlLabel,InputLabel,
        MenuItem,TextField,Button,IconButton } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import { makeStyles } from '@material-ui/core/styles';

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
 * This form isn't very dynamic with its construction, but does re-render
 * based on the type of attribute selected in the dropdown.  The only property
 * needed is the callback function to send back the attribute object.
 * Uses material-ui for the form elements.
 * @param {*} props
 */
const AddAttribute = (props) => {

    //need some state for UI
    //name - string
    const [name, setName] = useState('');

    //type - string
    const [value, setValue] = useState('string');

    //type - string
    const [type, setType] = useState('string');

    const [showAddOps, setShowAddOps] = useState(false);

    //additionalOptions - array of strings
    const [additionalOptions, setAdditionalOptions] = useState([]);

    //multi-select flag - bool only on additional options.
    const [multi, setMulti] = useState(false);

    const handleShowAddOps = (event) => {
        setShowAddOps(event.target.checked);
    };

    const handleTypeChange = (event) => {
        setType(event.target.value);
        if(event.target.value !== 'string' && showAddOps)
            setShowAddOps(false);
    };

    const handleAddOption = () => {
        const tempArray = additionalOptions.concat('');
        setAdditionalOptions(tempArray);
    };

    const deleteOption = (index) => {
        const tempArray = additionalOptions.filter((value,ind) => index != ind);
        setAdditionalOptions(tempArray);
    };

    const handleNameChange = (event) => {
        setName(event.target.value);
    };

    const handleMultiChange = (event) => {
        setMulti(event.target.checked);
    }

    const handleValueChange = (event) => {
        setValue(event.target.value);
    }

    const handleOptionChange = (event, index) => {
        const tempArray = [];
        for ( let key in additionalOptions) {
            if(key == index) {
                tempArray.push(event.target.value);
            } else {
                tempArray.push(additionalOptions[key]);
            }
        }

        setAdditionalOptions(tempArray);
    };

    let addOpsCheck = null;

    if(type === 'string') {
        addOpsCheck = (
            <FormControlLabel
                control={
                    <Checkbox
                        checked={showAddOps}
                        onChange={handleShowAddOps}
                        value="showAdd"
                        color="primary"
                    />
            }
            label="Additional Options"
          />
        );
    }

    if (type === 'hyperlink') {
        addOpsCheck = (
          <FormControl className={useStyles.formControl}>
              <TextField
                id="value"
                label="URL"
                onChange={(event) => handleValueChange(event)}
              />
          </FormControl>
        );
    }

    if (type === 'note') {
        addOpsCheck = (
          <FormControl className={useStyles.formControl}>
              <TextField
                id="value"
                label="Note text"
                onChange={(event) => handleValueChange(event)}
              />
          </FormControl>
        );
    }

    let additionalOps = null;
    let addAnotherBtn = null;

    if(showAddOps) {
        additionalOps = (
            additionalOptions.map((data,index) => {
                return (
                <React.Fragment key={index}>
                <FormControl key={index} className={useStyles.formControl}>
                    <TextField id={"option-"+(index+1)}
                            label={"Option "+(index+1)}
                            onChange={(event) => handleOptionChange(event,index)}
                            value={data} />
                </FormControl>
                <IconButton aria-label="delete" onClick={() => deleteOption(index)}>
                    <DeleteIcon />
                </IconButton>
                <br/>
                <br/>
                </React.Fragment>)
            })
        );
        addAnotherBtn = (
            <Button variant="contained" color="primary" onClick={handleAddOption} >Add Option</Button>
        );

    }

    let showMultiCheck = null;

    if(additionalOptions.length > 1) {
        showMultiCheck = (
            <FormControlLabel
                control={
                    <Checkbox
                        checked={multi}
                        onChange={handleMultiChange}
                        value="showMulti"
                        color="primary"
                    />
            }
            label="Mutli-Select"
          />
        );
    }

    //build the return object, format unknown.
    const buildAttr = () => {
        return {
            name: name,
            value: value,
            type: type,
            options: (additionalOptions.length?additionalOptions:undefined),
            multi: multi
        };
    }

    return (
        <div>
            <h3>Enter Attribute Details</h3>
            <FormControl className={useStyles.formControl}>
                <TextField required
                    id="standard-required"
                    label="Name"
                    value={name}
                    onChange={handleNameChange} />
            </FormControl>
            <br/>
            <br/>
            <FormControl className={useStyles.formControl}>
                <InputLabel id="attribute-type-label">Type</InputLabel>
                <Select
                    labelId="attribute-type-label"
                    id="attribute-type"
                    value={type}
                    onChange={handleTypeChange}
                >
                <MenuItem value='string'>Text</MenuItem>
                <MenuItem value='textbox'>Textbox</MenuItem>
                <MenuItem value='number'>Number</MenuItem>
                <MenuItem value='boolean'>On/Off Switch (Boolean)</MenuItem>
                <MenuItem value='hyperlink'>Hyperlink</MenuItem>
                <MenuItem value='note'>Note</MenuItem>
                {/* TODO: <MenuItem value='date'>Date</MenuItem> */}
                {/* TODO: <MenuItem value='sand'>Agree/Disagree</MenuItem> */}
                </Select>
            </FormControl>
            &emsp;&emsp;{addOpsCheck}
            <br/>
            <br/>
            {additionalOps}
            {/* TODO: showMultiCheck */}
            <br/>
            {addAnotherBtn}&emsp;
            <Button variant="contained"
                color="primary"
                onClick={() => props.create(buildAttr())} >
                Create Attribute
            </Button>
        </div>
    );
}

export default AddAttribute;
