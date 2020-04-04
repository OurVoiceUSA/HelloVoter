import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import ReactPaginate from 'react-paginate';
import Select from 'react-select';
import t from 'tcomb-form';

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';

import { CardForm, FormEditor } from '.';

import {
  _fetch,
  notify_error,
  notify_success,
  _searchStringify,
  _loadForms,
  _loadAttributes,
  RootLoader,
  DialogSaving,
} from '../../common.js';

export default class Forms extends Component {
  constructor(props) {
    super(props);

    let perPage = localStorage.getItem('formsperpage');
    if (!perPage) perPage = 5;

    // TODO: this is only for brand new forms
    let fields = {};
    let order = Object.keys(fields);

    this.state = {
      global: props.global,
      loading: true,
      forms: [],
      attributes: [],
      attributes_selected: [],
      fields: fields,
      order: order,
      search: '',
      perPage: perPage,
      pageNum: 1,
      menuDelete: false
    };

    this.formServerItems = t.struct({
      name: t.String
    });

    this.formServerOptions = {
      fields: {
        name: {
          label: 'Form Name',
          error: 'You must enter a form name.'
        }
      }
    };

    this.onTypeSearch = this.onTypeSearch.bind(this);
    this.handlePageNumChange = this.handlePageNumChange.bind(this);
  }

  handleClickDelete = () => {
    this.setState({ menuDelete: true });
  };

  handleCloseDelete = () => {
    this.setState({ menuDelete: false });
  };

  handlePageNumChange(obj) {
    localStorage.setItem('volunteersperpage', obj.value);
    this.setState({ pageNum: 1, perPage: obj.value });
  }

  handlePageClick = data => {
    this.setState({ pageNum: data.selected + 1 });
  };

  onTypeSearch(event) {
    this.setState({
      search: event.target.value.toLowerCase(),
      pageNum: 1
    });
  }

  onChangeForm(addFormForm) {
    this.setState({ addFormForm });
  }

  componentDidMount() {
    this._loadData();
  }

  _loadData = async () => {
    const { global } = this.state;

    this.setState({ loading: true });
    let forms = [];
    let attributes = [], attributes_selected = [];
    let fields = {};

    try {
      forms = await _loadForms(global);
      attributes = await _loadAttributes(global);

      // convert attributes to fields
      attributes.forEach(a => {
        fields[a.id] = { label: a.name, type: a.type, optional: true, options: a.values };
      });
    } catch (e) {
      notify_error(e, 'Unable to load forms.');
    }
    this.setState({ forms, attributes, attributes_selected, fields, loading: false });
  };

  _deleteForm = async id => {
    const { global } = this.state;

    this.setState({ saving: true, menuDelete: false });
    try {
      await _fetch(global, '/form/delete', 'POST', {
        formId: id
      });
      notify_success('Form has been deleted.');
    } catch (e) {
      notify_error(e, 'Unable to delete form.');
    }
    this.setState({ saving: false });

    window.location.href = '/HelloVoterHQ/#/forms/';
    this._loadData();
  };

  _createForm = async () => {
    const { global, attributes_selected } = this.state;

    let json = this.addFormForm.getValue();
    if (json === null) return;

    // get rid of ending whitespace
    let formName = json.name.trim();

    // disallow anything other than alphanumeric and a few other chars
    if (!formName.match(/^[a-zA-Z0-9\-_ ]+$/)) {
      notify_error(
        {},
        'From name can only contain alphanumeric characters, and spaces and dashes.'
      );
      return;
    }

    // max length
    if (formName.length > 255) {
      notify_error({}, 'Form name cannot be longer than 255 characters.');
      return;
    }

    this.setState({ saving: true });

    // make sure this name doesn't exist
    try {
      let obj;

      obj = {
        name: formName,
        attributes: attributes_selected.map(a => a.id),
      };

      await _fetch(global, '/form/create', 'POST', obj);
      notify_success('Form has been created.');
    } catch (e) {
      notify_error(e, 'Unable to create form.');
    }
    this.setState({ saving: false });

    window.location.href = '/HelloVoterHQ/#/forms/';
    this._loadData();
  };

  atupdate = props => {
    const { attributes_selected } = props;
    this.setState({attributes_selected});
  }

  render() {
    const { global } = this.state;

    let list = [];

    this.state.forms.forEach(f => {
      if (this.state.search && !_searchStringify(f).includes(this.state.search))
        return;
      list.push(f);
    });

    return (
      <Router>
        <div>
          <Route
            exact={true}
            path="/forms/"
            render={() => (
              <RootLoader
                flag={this.state.loading}
                func={() => this._loadData()}
              >
                Search:{' '}
                <input
                  type="text"
                  value={this.state.value}
                  onChange={this.onTypeSearch}
                  data-tip="Search by name, email, location, or admin"
                />
                <br />
                <ListForms global={global} forms={list} refer={this} />
              </RootLoader>
            )}
          />
          <Route
            path="/forms/add"
            render={props => (
              <div>
                <t.form.Form
                  ref={ref => (this.addFormForm = ref)}
                  type={this.formServerItems}
                  options={this.formServerOptions}
                  onChange={e => this.onChangeForm(e)}
                  value={this.state.addFormForm}
                />

                <FormEditor onChange={this.atupdate} attributes={this.state.attributes} selected={this.state.attributes_selected} />

                <button
                  style={{ margin: 25 }}
                  onClick={() => this._createForm()}
                >
                  Create Form
                </button>

              </div>
            )}
          />
          <Route
            path="/forms/view/:id"
            render={props => (
              <div>
                <CardForm
                  global={global}
                  key={props.match.params.id}
                  id={props.match.params.id}
                  edit={true}
                  refer={this}
                />
                <br />
                <br />
                <br />
                <br />
                <Button onClick={this.handleClickDelete} color="primary">
                  Delete Form
                </Button>
                <Dialog
                  open={this.state.menuDelete}
                  onClose={this.handleCloseDelete}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                >
                  <DialogTitle id="alert-dialog-title">
                    Are you sure you wish to delete this form?
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
                      onClick={() => this._deleteForm(props.match.params.id)}
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

const ListForms = props => {
  const perPage = props.refer.state.perPage;
  let paginate = <div />;
  let list = [];

  props.forms.forEach((f, idx) => {
    let tp = Math.floor(idx / perPage) + 1;
    if (tp !== props.refer.state.pageNum) return;
    list.push(<CardForm global={props.global} key={f.id} form={f} refer={props.refer} />);
  });

  paginate = (
    <div style={{ display: 'flex' }}>
      <ReactPaginate
        previousLabel={'previous'}
        nextLabel={'next'}
        breakLabel={'...'}
        breakClassName={'break-me'}
        pageCount={props.forms.length / perPage}
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
            { value: 100, label: 100 }
          ]}
        />
      </div>
    </div>
  );

  return (
    <div>
      <h3>
        {props.type}Forms ({props.forms.length})
      </h3>
      <Link to={'/forms/add'}>
        <button>Add Form</button>
      </Link>
      {paginate}
      {list}
      {paginate}
    </div>
  );
};
