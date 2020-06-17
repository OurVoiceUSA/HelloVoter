import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import ReactPaginate from 'react-paginate';
import EdiText from 'react-editext';
import Select from 'react-select';
import t from 'tcomb-form';

import CircularProgress from '@material-ui/core/CircularProgress';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import PaperclipIcon from '@material-ui/icons/AttachFile';
import AddAttribute from './Attribute/AddAttribute';

import {
  _loadAttribute,
  _loadAttributes,
  _searchStringify,
  _fetch,
  notify_error,
  notify_success,
  RootLoader,
  DialogSaving,
  ucFirst,
} from '../common.js';

function value2select(val) {
  return {value: val, label: ucFirst(val)};
}

const typeOptions = [
  value2select("string"),
  value2select("boolean"),
  value2select("number"),
  value2select("textbox"),
];

export default class App extends Component {
  constructor(props) {
    super(props);

    let perPage = localStorage.getItem('attributesperpage');
    if (!perPage) perPage = 5;

    this.state = {
      global: props.global,
      loading: true,
      attributes: [],
      search: '',
      perPage: perPage,
      pageNum: 1,
      menuDelete: false,
    };

    this.formServerItems = t.struct({
      name: t.String,
    });

    this.formServerOptions = {
      fields: {
        server: {
          label: 'Attribute Name',
          error: 'You must enter an Attribute name.',
        },
      },
    };

    this.onTypeSearch = this.onTypeSearch.bind(this);
    this.handlePageNumChange = this.handlePageNumChange.bind(this);
  }

  componentDidMount() {
    console.log(this.addattributeForm);
    this._loadData();
  }

  handleClickDelete = () => {
    this.setState({ menuDelete: true });
  };

  handleCloseDelete = () => {
    this.setState({ menuDelete: false });
  };

  onChangeAttribute(addAttributeForm) {
    console.log("Changing attributeState: ",addAttributeForm);
    //this.setState({ addAttributeForm });
    this.setState({name: addAttributeForm.name});
  }

  handlePageNumChange(obj) {
    localStorage.setItem('attributesperpage', obj.value);
    this.setState({ pageNum: 1, perPage: obj.value });
  }

  onTypeSearch(event) {
    this.setState({
      search: event.target.value.toLowerCase(),
      pageNum: 1,
    });
  }

  _deleteAttribute = async (id) => {
    const { global } = this.state;

    this.setState({ saving: true, menuDelete: false });
    try {
      await _fetch(global, '/attribute/delete', 'POST', {
        id: id,
      });
      notify_success('Attribute has been deleted.');
    } catch (e) {
      notify_error(e, 'Unable to delete Attributes.');
    }
    this.setState({ saving: false });

    window.location.href = '/HelloVoterHQ/#/attributes/';
    this._loadData();
  };

  _createAttribute = async (attr) => {
    //console.log(attr);
    const { global } = this.state;

    //let json = this.addAttributeForm.getValue();
    let json = attr;
    if (json === null) return;

    this.setState({ saving: true });

    try {
      await _fetch(global, '/attribute/create', 'POST', json);
      notify_success('Attribute has been created.');
    } catch (e) {
      notify_error(e, 'Unable to create Attribute.');
    }
    this.setState({ saving: false });

    window.location.href = '/HelloVoterHQ/#/attributes/';
    this._loadData();
  };

  _loadData = async () => {
    const { global } = this.state;

    this.setState({ loading: true, search: '' });
    let attributes = [];

    try {
      attributes = await _loadAttributes(global);
    } catch (e) {
      notify_error(e, 'Unable to load volunteers.');
    }

    this.setState({ loading: false, attributes });
  };

  handlePageClick = data => {
    this.setState({ pageNum: data.selected + 1 });
  };

  render() {
    const { global } = this.state;

    let list = [];

    this.state.attributes.forEach(t => {
      if (this.state.search && !_searchStringify(t).includes(this.state.search))
        return;
      list.push(t);
    });

    return (
      <Router>
        <div>
          <Route
            exact={true}
            path="/attributes/"
            render={() => (
              <RootLoader flag={this.state.loading} func={this._loadData}>
                Search:{' '}
                <input
                  type="text"
                  value={this.state.value}
                  onChange={this.onTypeSearch}
                  data-tip="Search by name, email, location, or admin"
                />
                <ListAttributes global={global} refer={this} attributes={list} />
              </RootLoader>
            )}
          />
          <Route
            exact={true}
            path="/attributes/add"
            render={() => (
              // <div>
              //   <t.form.Form
              //     // ref={ref => (this.addattributeForm = ref)}
              //     type={this.formServerItems}
              //     options={this.formServerOptions}
              //     onChange={e => this.onChangeAttribute(e)}
              //     value={this.state.name}
              //   />
              //   <button onClick={() => this._createAttribute()}>Submit</button>
              // </div>
              <AddAttribute create={(data) => this._createAttribute(data)}/>
            )}
          />
          <Route
            path="/attributes/view/:id"
            render={props => (
              <div>
                <CardAttribute
                  global={global}
                  key={props.match.params.id}
                  id={props.match.params.id}
                  edit={true}
                  refer={this}
                />
                <br />
                <br />
                <br />
                <Button onClick={this.handleClickDelete} color="primary">
                  Delete attribute
                </Button>
                <Dialog
                  open={this.state.menuDelete}
                  onClose={this.handleCloseDelete}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                >
                  <DialogTitle id="alert-dialog-title">
                    Are you sure you wish to delete this attribute?
                  </DialogTitle>
                  <DialogActions>
                    <Button
                      onClick={this.handleCloseDelete}
                      color="primary"
                      autoFocus
                    >
                      No
                    </Button>
                    <Button
                      onClick={() => this._deleteAttribute(props.match.params.id)}
                      color="primary"
                    >
                      Yes
                    </Button>
                  </DialogActions>
                </Dialog>
              </div>
            )}
          />
          <DialogSaving flag={this.state.saving} />
        </div>
      </Router>
    );
  }
}

const ListAttributes = props => {
  const perPage = props.refer.state.perPage;
  let paginate = <div />;
  let list = [];

  props.attributes.forEach((t, idx) => {
    let tp = Math.floor(idx / perPage) + 1;
    if (tp !== props.refer.state.pageNum) return;
    list.push(<CardAttribute global={props.global} key={t.id} attribute={t} refer={props.refer} />);
  });

  paginate = (
    <div style={{ display: 'flex' }}>
      <ReactPaginate
        previousLabel={'previous'}
        nextLabel={'next'}
        breakLabel={'...'}
        breakClassName={'break-me'}
        pageCount={props.attributes.length / perPage}
        marginPagesDisplayed={1}
        pageRangeDisplayed={8}
        onPageChange={props.refer.handlePageClick}
        containerClassName={'pagination'}
        subContainerClassName={'pages pagination'}
        activeClassName={'active'}
      />
      &nbsp;&nbsp;&nbsp;
      <div style={{ width: 75 }}>
        # Per Page{' '}
        <Select
          value={{ value: perPage, label: perPage }}
          onChange={props.refer.handlePageNumChange}
          options={[
            { value: 5, label: 5 },
            { value: 10, label: 10 },
            { value: 25, label: 25 },
            { value: 50, label: 50 },
            { value: 100, label: 100 },
          ]}
        />
      </div>
    </div>
  );

  return (
    <div>
      <h3>
        {props.type}Attributes ({props.attributes.length})
      </h3>
      <Link to={'/attributes/add'}>
        <button>Add attribute</button>
      </Link>
      {paginate}
      {list}
      {paginate}
    </div>
  );
};

export class CardAttribute extends Component {
  constructor(props) {
    super(props);

    this.state = {
      global: props.global,
      attribute: this.props.attribute,
      selectedMembersOption: [],
    };

    this.onSaveName = this.onSaveName.bind(this);
    this.onSaveType = this.onSaveType.bind(this);
  }

  componentDidMount() {
    if (!this.state.attribute) this._loadData();
  }

  handleMembersChange = async selectedMembersOption => {

    if (!selectedMembersOption) selectedMembersOption = [];
    this.props.refer.setState({ saving: true });

  };

  _loadData = async () => {
    const { global } = this.state;

    let attribute = {};
    this.setState({ loading: true });

    try {
      [
        attribute,
      ] = await Promise.all([
        _loadAttribute(global, this.props.id),
      ]);
    } catch (e) {
      notify_error(e, 'Unable to load attribute info.');
      return this.setState({ loading: false });
    }

    this.setState({
      attribute,
      loading: false,
    });
  };

  onSave = async (type, val) => {
    const { global, attribute } = this.state;

    this.setState({ saving: true });

    let obj = {id: attribute.id};
    obj[type] = val;

    try {
      await _fetch(
        global,
        '/attribute/update',
        'POST',
        obj
      );
      notify_success('Attribute has been updated.');
    } catch (e) {
      notify_error(e, 'Unable to update Attribute.');
    }

    this._loadData();
  }

  onSaveName(val) {
    this.onSave('name', val);
  }

  onSaveType(val) {
    this.onSave('type', val);
  }

  render() {
    const { attribute } = this.state;

    if (!attribute || this.state.loading) {
      return <CircularProgress />;
    }

    return (
      <div>
        <div style={{ display: 'flex', padding: '10px' }}>
          <div style={{ flex: 1, overflow: 'auto', padding: '5px 10px' }}>
            <PaperclipIcon />{' '}
            {attribute.name}{' '}
            {this.props.edit ? (
              ''
            ) : (
              <Link to={'/attributes/view/' + attribute.id}>view</Link>
            )}
          </div>
        </div>
        {this.props.edit ? <CardAttributeFull attribute={attribute} onSaveName={this.onSaveName} onSaveType={this.onSaveType} /> : ''}
      </div>
    );
  }
}

export const CardAttributeFull = ({attribute, onSaveName, onSaveType}) => (
  <div>
    <h1><EdiText type="text" value={attribute.name} onSave={onSaveName} onSaveType={onSaveType} /></h1>
    <Select
      value={value2select(attribute.type)}
      onChange={onSaveType}
      options={typeOptions}
      isMulti={false}
      isSearchable={true}
      placeholder="Select an attribute type"
    />
    {JSON.stringify(attribute)}
  </div>
);
