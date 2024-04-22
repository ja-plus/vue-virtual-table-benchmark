export const tableColumns = [
  {
    title: 'Name',
    dataIndex: 'name',
    fixed: 'left',
    width: 200,
    headerClassName: 'my-th',
    className: 'my-td',
    sorter: true,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    fixed: 'left',
    width: 100,
    align: 'right',
    headerAlign: 'right',
  },
  {
    title: 'Gender',
    dataIndex: 'gender',
    width: 150,
    sortType: 'number', // 指定为数字排序
  },
  {
    title: 'Email(sortBy:name)',
    dataIndex: 'email',
    width: 150,
  },
  /** overflow 必须设置maxWidth */
  { title: 'Address', dataIndex: 'address', width: 100 },
  { title: 'Address', dataIndex: 'address1', width: 100 },
  { title: 'Address', dataIndex: 'address2', width: 100 },
  { title: 'Address', dataIndex: 'address3', width: 100 },
  {
    dataIndex: 'R',
    title: 'R',
    width: 50,
    fixed: 'right',
  },
  {
    title: 'Operate',
    dataIndex: 'Operate',
    width: 150,
    fixed: 'right',
  },
  ...new Array(10).fill(0).map((it, i) => {
    return {
      title: 'other' + i,
      dataIndex: 'other' + i,
      width: 100,
    };
  }),
];
export const tableData = new Array(1000).fill(0).map((it, i) => {
  return {
    id: i + 'id',
    name: 'name' + i,
    age: 'age' + i,
  };
});
