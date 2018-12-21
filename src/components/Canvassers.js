import React, { Component } from 'react';

import { HashRouter as Router, Route, Link } from 'react-router-dom';
import ReactPaginate from 'react-paginate';

import { notify_error, RootLoader, CardCanvasser, _loadCanvassers, _searchStringCanvasser } from '../common.js';

const perPage = 5;

export default class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      canvassers: [],
      search: "",
      pageNum: 1,
    };

    this.onTypeSearch = this.onTypeSearch.bind(this);
  }

  componentDidMount() {
    this._loadData();
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
  let list = [];

  props.canvassers.forEach((c, idx) => {
    let tp = Math.floor(idx/perPage)+1;
    if (tp !== props.refer.state.pageNum) return;
    list.push(<CardCanvasser key={c.id} canvasser={c} refer={props.refer} />);
  });

  return (
    <div>
      Search: <input type="text" value={props.refer.state.value} onChange={props.refer.onTypeSearch} data-tip="Search by name, email, location, or admin" />
      <br />
      <Link to={'/canvassers/'}>Canvassers</Link> - <Link to={'/canvassers/unassigned'}>Unassigned</Link> - <Link to={'/canvassers/denied'}>Denied</Link>
      <div>
        <h3>{props.type}Canvassers ({props.canvassers.length})</h3>
        {list}
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
                       activeClassName={"active"} />
       </div>
     </div>
   );
};
