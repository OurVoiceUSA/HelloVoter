import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import ReactPaginate from 'react-paginate';
import Select from 'react-select';

import { notify_error, RootLoader, CardCanvasser, _loadCanvassers, _searchStringCanvasser } from '../common.js';

export default class App extends Component {

  constructor(props) {
    super(props);

    let perPage = localStorage.getItem('canvassersperpage');
    if (!perPage) perPage = 5;

    this.state = {
      loading: true,
      canvassers: [],
      search: "",
      perPage: perPage,
      pageNum: 1,
    };

    this.onTypeSearch = this.onTypeSearch.bind(this);
    this.handlePageNumChange = this.handlePageNumChange.bind(this);
  }

  componentDidMount() {
    this._loadData();
  }

  handlePageNumChange(obj) {
    localStorage.setItem('canvassersperpage', obj.value);
    this.setState({pageNum: 1, perPage: obj.value});
  }

  onTypeSearch (event) {
    this.setState({
      search: event.target.value.toLowerCase(),
      pageNum: 1,
    })
  }

  _loadData = async () => {
    let canvassers = [];
    this.setState({loading: true, search: ""});
    try {
      canvassers = await _loadCanvassers(this);
    } catch (e) {
      notify_error(e, "Unable to load canvassers.");
    }
    this.setState({loading: false, canvassers});
  }

  handlePageClick = (data) => {
    this.setState({pageNum: data.selected+1});
  }

  render() {

    let ready = [];
    let unassigned = [];
    let denied = [];

    this.state.canvassers.forEach(c => {
      if (this.state.search && !_searchStringCanvasser(c).includes(this.state.search)) return;
      if (c.locked) {
        denied.push(c);
      } else {
        if (c.ass.ready || c.ass.teams.length)
          ready.push(c);
        else
          unassigned.push(c);
      }
    });

    return (
      <RootLoader flag={this.state.loading} func={() => this._loadData()}>
        <Router>
          <div>
            Search: <input type="text" value={this.state.value} onChange={this.onTypeSearch} data-tip="Search by name, email, location, or admin" />
            <br />
            <Link to={'/canvassers/'} onClick={() => this.setState({pageNum: 1})}>Canvassers ({ready.length})</Link>&nbsp;-&nbsp;
            <Link to={'/canvassers/unassigned'} onClick={() => this.setState({pageNum: 1})}>Unassigned ({unassigned.length})</Link>&nbsp;-&nbsp;
            <Link to={'/canvassers/denied'} onClick={() => this.setState({pageNum: 1})}>Denied ({denied.length})</Link>
            <Route exact={true} path="/canvassers/" render={() => (<ListCanvassers refer={this} canvassers={ready} />)} />
            <Route exact={true} path="/canvassers/unassigned" render={() => (<ListCanvassers refer={this} type="Unassigned" canvassers={unassigned} />)} />
            <Route exact={true} path="/canvassers/denied" render={() => (<ListCanvassers refer={this} type="Denied" canvassers={denied} />)} />
            <Route path="/canvassers/view/:id" render={(props) => (
              <CardCanvasser key={props.match.params.id} id={props.match.params.id} edit={true} refer={this} />
            )} />
          </div>
        </Router>
      </RootLoader>
    );
  }
}

const ListCanvassers = (props) => {
  const perPage = props.refer.state.perPage;
  let paginate = (<div></div>);
  let list = [];

  props.canvassers.forEach((c, idx) => {
    let tp = Math.floor(idx/perPage)+1;
    if (tp !== props.refer.state.pageNum) return;
    list.push(<CardCanvasser key={c.id} canvasser={c} refer={props.refer} />);
  });

  if ((props.canvassers.length/perPage) > 1) {
    paginate = (
      <div style={{display: 'flex'}}>
        <ReactPaginate previousLabel={"previous"}
          nextLabel={"next"}
          breakLabel={"..."}
          breakClassName={"break-me"}
          pageCount={props.canvassers.length/perPage}
          marginPagesDisplayed={1}
          pageRangeDisplayed={8}
          onPageChange={props.refer.handlePageClick}
          containerClassName={"pagination"}
          subContainerClassName={"pages pagination"}
          activeClassName={"active"}
        />
        &nbsp;&nbsp;&nbsp;
        <div style={{width: 75}}>
        # Per Page <Select
          value={{value: perPage, label: perPage}}
          onChange={props.refer.handlePageNumChange}
          options={[
            {value: 5, label: 5},
            {value: 10, label: 10},
            {value: 25, label: 25},
            {value: 50, label: 50},
            {value: 100, label: 100}
          ]}
        />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3>{props.type}Canvassers ({props.canvassers.length})</h3>
      {paginate}
      {list}
      {paginate}
     </div>
   );
};
