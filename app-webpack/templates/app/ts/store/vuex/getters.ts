import { type GetterTree } from 'vuex';
import { type StateInterface } from '../index';
import { type ExampleStateInterface } from './state';

const getters: GetterTree<ExampleStateInterface, StateInterface> = {
  someGetter (/* context */) {
    // your code
  }
};

export default getters;
