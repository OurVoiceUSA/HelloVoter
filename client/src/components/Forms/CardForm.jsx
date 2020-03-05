import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import CircularProgress from '@material-ui/core/CircularProgress';
import { faClipboard } from '@fortawesome/free-solid-svg-icons';
import EdiText from 'react-editext';

import { CardVolunteer } from '../Volunteers';
import { CardFormFull } from '.';

import {
  _fetch,
  notify_error,
  notify_success,
  _handleSelectChange,
  _searchStringify,
  _loadForm,
  _loadVolunteers,
  _loadAttributes,
  Icon,
} from '../../common.js';

export default class CardForm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      global: props.global,
      form: this.props.form,
      selectedMembersOption: [],
      attributes: [],
      attributes_selected: [],
    };
  }

  componentDidMount() {
    if (!this.state.form) this._loadData();
  }

  handleNameChange = async (name) => {
    const { global } = this.state;

    try {
      await _fetch(
        global,
        '/form/update',
        'POST',
        { formId: this.props.id, name: name }
      );
      notify_success('Form name saved.');
    } catch (e) {
      notify_error(e, 'Unable to save form name.');
    }
  }

  handleAttributeChange = async ({attributes_selected}) => {
    const { global } = this.state;

    try {
      await _fetch(
        global,
        '/form/update',
        'POST',
        { formId: this.props.id, attributes: attributes_selected.map(a => a.id) }
      );
      notify_success('Attributes assignments saved.');
    } catch (e) {
      notify_error(e, 'Unable to add/remove attribute.');
    }
  }

  handleMembersChange = async selectedMembersOption => {
    const { global } = this.state;

    if (!selectedMembersOption) selectedMembersOption = [];
    this.props.refer.setState({ saving: true });
    try {
      let obj = _handleSelectChange(
        this.state.selectedMembersOption,
        selectedMembersOption
      );

      let adrm = [];

      obj.add.forEach(add => {
        adrm.push(_fetch(
          global,
          '/form/assigned/volunteer/add',
          'POST',
          { vId: add, formId: this.props.id }
        ));
      });

      obj.rm.forEach(rm => {
        adrm.push(_fetch(
          global,
          '/form/assigned/volunteer/remove',
          'POST',
          { vId: rm, formId: this.props.id }
        ));
      });

      await Promise.all(adrm);

      notify_success('Volunteer assignments saved.');
      this.setState({ selectedMembersOption });
    } catch (e) {
      notify_error(e, 'Unable to add/remove volunteers.');
    }
    this.props.refer.setState({ saving: false });
  };

  _loadData = async () => {
    const { global } = this.state;

    let form = {},
      volunteers = [],
      members = [],
      attributes = [];

    this.setState({ loading: true });

    try {
      [form, volunteers, members, attributes] = await Promise.all([
        _loadForm(global, this.props.id, true),
        _loadVolunteers(global),
        _loadVolunteers(global, 'form', this.props.id),
        _loadAttributes(global)
      ]);
    } catch (e) {
      notify_error(e, 'Unable to load form info.');
      return this.setState({ loading: false });
    }

    let membersOption = [];
    let selectedMembersOption = [];

    volunteers.forEach(c => {
      membersOption.push({
        value: _searchStringify(c),
        id: c.id,
        label: <CardVolunteer global={global} key={c.id} volunteer={c} refer={this} />
      });
    });

    members.forEach(c => {
      selectedMembersOption.push({
        value: _searchStringify(c),
        id: c.id,
        label: <CardVolunteer global={global} key={c.id} volunteer={c} refer={this} />
      });
    });

    this.setState({
      form,
      attributes,
      attributes_selected: form.attributes.map(a => {
        if (!a.label) a.label = a.name;
        return a;
      }),
      volunteers,
      membersOption,
      selectedMembersOption,
      loading: false,
    });

  };

  render() {
    const { global, form, attributes, attributes_selected } = this.state;

    if (!form || this.state.loading) {
      return <CircularProgress />;
    }

    return (
      <div>
        <div style={{ display: 'flex', padding: '10px' }}>
          <div style={{ padding: '5px 10px' }}>
            <Icon
              icon={faClipboard}
              style={{ width: 20, height: 20, color: 'gray' }}
            />{' '}
            {this.props.edit ? (
              <EdiText type="text" value={form.name} onSave={this.handleNameChange} />
            ) :
              form.name
            }
            &nbsp;
            {this.props.edit ? (
              ''
            ) : (
              <Link to={'/forms/view/' + form.id}>view</Link>
            )}
          </div>
        </div>
        {this.props.edit ? <CardFormFull global={global} form={form} refer={this} attributes={attributes} selected={attributes_selected} /> : ''}
      </div>
    );
  }
}
