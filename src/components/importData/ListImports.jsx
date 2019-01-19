import React from 'react';
import ReactPaginate from 'react-paginate';
import Select from 'react-select';
import List from '@material-ui/core/List';

const CardImport = props => {
  return (
    <div>
      {JSON.stringify(props.import)}
      <br />
      <br />
      <br />
    </div>
  );
};

const ListImports = ({
  perPage,
  imports,
  pageNum,
  handlePageClick,
  handlePageNumChange
}) => {
  let paginate = <div />;
  let list = [];

  imports.forEach((i, idx) => {
    let tp = Math.floor(idx / perPage) + 1;
    if (tp !== pageNum) return;
    list.push(<CardImport key={i.filename} import={i} />);
  });

  paginate = (
    <div style={{ display: 'flex' }}>
      <ReactPaginate
        previousLabel={'previous'}
        nextLabel={'next'}
        breakLabel={'...'}
        breakClassName={'break-me'}
        pageCount={imports.length / perPage}
        marginPagesDisplayed={1}
        pageRangeDisplayed={8}
        onPageChange={handlePageClick}
        containerClassName={'pagination'}
        subContainerClassName={'pages pagination'}
        activeClassName={'active'}
      />
      &nbsp;&nbsp;&nbsp;
      <div style={{ width: 75 }}>
        # Per Page{' '}
        <Select
          value={{ value: perPage, label: perPage }}
          onChange={handlePageNumChange}
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
      <h3>Import History</h3>
      {paginate}
      <List component="nav">{list}</List>
      {paginate}
    </div>
  );
};

export default ListImports;
