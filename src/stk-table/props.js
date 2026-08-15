const customCell = void 0; // props => props.cellValue;

export const tableColumns = [
  {
    title: 'Name',
    dataIndex: 'name',
    fixed: 'left',
    width: 200,
    headerClassName: 'my-th',
    className: 'my-td',
    sorter: true,
    customCell,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    fixed: 'left',
    width: 100,
    align: 'right',
    headerAlign: 'right',
    customCell,
  },
  {
    title: 'Gender',
    dataIndex: 'gender',
    width: 150,
    sortType: 'number', // 指定为数字排序
    customCell,
  },
  {
    title: 'Email(sortBy:name)',
    dataIndex: 'email',
    width: 150,
    customCell,
  },
  /** overflow 必须设置maxWidth */
  {
    title: 'Address',
    dataIndex: 'address',
    width: 100,
    customCell,
  },
  {
    title: 'Address',
    dataIndex: 'address1',
    width: 100,
    customCell,
  },
  {
    title: 'Address',
    dataIndex: 'address2',
    width: 100,
    customCell,
  },
  {
    title: 'Address',
    dataIndex: 'address3',
    width: 100,
    customCell,
  },

  ...new Array(30).fill(0).map((it, i) => {
    return {
      title: 'other' + i,
      dataIndex: 'other' + i,
      width: 100,
      customCell,
    };
  }),
  {
    dataIndex: 'R',
    title: 'R',
    width: 50,
    fixed: 'right',
    customCell,
  },
  {
    title: 'Operate',
    dataIndex: 'Operate',
    width: 150,
    fixed: 'right',
    customCell,
  },
];
export const tableData = new Array(10000).fill(0).map((it, i) => {
  return {
    id: i + 'id',
    name: 'name' + i,
    age: 'age' + i,
  };
});
