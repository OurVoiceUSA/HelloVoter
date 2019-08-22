import React from 'react';
import { Link } from 'react-router-dom';

import ReactPaginate from 'react-paginate';
import Select from 'react-select';

import { CardTurf } from './CardTurf';

export const ListTurf = props => {
  const perPage = props.refer.state.perPage;
  let paginate = <div />;
  let list = [];

  props.turf.forEach((t, idx) => {
    let tp = Math.floor(idx / perPage) + 1;
    if (tp !== props.refer.state.pageNum) return;
    list.push(<CardTurf global={props.global} key={t.id} turf={t} refer={props.refer} />);
  });

  paginate = (
    <div style={{ display: 'flex' }}>
      <ReactPaginate
        previousLabel={'previous'}
        nextLabel={'next'}
        breakLabel={'...'}
        breakClassName={'break-me'}
        pageCount={props.turf.length / perPage}
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
        {props.type}Turf ({props.turf.length})
      </h3>
      <Link to={'/turf/add'}>
        <button>Add Turf</button>
      </Link>
      {paginate}
      {list}
      {paginate}
    </div>
  );
};
