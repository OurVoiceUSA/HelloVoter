import { jobRuntime, jobNumber } from '../../common';

export const _pipe = (f, g) => (...args) => g(f(...args));
export const pipe = (...fns) => fns.reduce(_pipe);

export const PAPER_TABLE_SPEC = [
  {
    header: 'Import File',
    tooltip: 'The file name of the imported file.',
    params: ['filename'],
  },
  {
    header: 'Upload Time',
    tooltip:
      "The time it took the file to go from the uploader's computer to the server.",
    func: jobRuntime,
    params: ['created', 'submitted'],
  },
  {
    header: 'Queue Delay',
    tooltip:
      'The time this import had to wait in queue for other jobs to finish.',
    func: jobRuntime,
    params: ['submitted', 'parse_start'],
  },
  {
    header: 'Parse time',
    tooltip:
      'The time it took to aggregate address, people, and attribute data into the database.',
    func: jobRuntime,
    params: ['parse_start', 'parse_end'],
  },
  {
    header: 'Record Count',
    tooltip: 'The number of unique records contained in the import file.',
    func: jobNumber,
    params: ['num_records'],
  },
  {
    header: 'Geocode Time',
    tooltip:
      'The time it took the system to geocode the addresses in the import file.',
    func: jobRuntime,
    params: ['geocode_start', 'geocode_end'],
  },
  {
    header: 'Dedupe Time',
    tooltip:
      'The time it took the system to identify and remove duplicates as a result of this import.',
    func: jobRuntime,
    params: ['dedupe_start', 'dedupe_end'],
  },
  {
    header: 'Turf Index Time',
    tooltip:
      'The time it took the system to index each address to turfs it belongs to.',
    func: jobRuntime,
    params: ['turfadd_start', 'turfadd_end'],
  },
  {
    header: 'Address Index Time',
    tooltip:
      'The time it took to add these addresses to the master database index.',
    func: jobRuntime,
    params: ['index_start', 'index_end'],
  },
  {
    header: 'Total Time',
    tooltip:
      'The total time the import took from file upload start to complete finish.',
    func: jobRuntime,
    params: ['created', 'completed'],
  },
];
