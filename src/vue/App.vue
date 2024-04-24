<script setup>
import StkTable from './StkTable.vue';
import VxeTable from './VxeTable.vue';
import NaiveTable from './NaiveTable.vue';
import ElementTable from './ElementTable.vue';
import ArcoTable from './ArcoTable.vue';
import TDesignTable from './TDesignTable.vue';
</script>

<template>
  <div>
    <h2>Vue3 App</h2>
    <StkTable></StkTable>
    <VxeTable></VxeTable>
    <NaiveTable></NaiveTable>
    <ElementTable></ElementTable>
    <ArcoTable></ArcoTable>
    <TDesignTable></TDesignTable>
    <div>
      <h2>ant-design-vue table</h2>
      <ul>
        <li>配置滚动不便</li>
        <li>
          无虚拟滚动。<a
            href="https://surely.cool/doc/performance"
            target="_blank"
            >surely vue</a
          >
        </li>
        <li>*表头吸顶</li>
      </ul>
    </div>
    <div>
      <h2>vuetify 虚拟表</h2>
      <ul>
        <li>
          文档不全<a
            href="https://vuetifyjs.com/zh-Hans/components/data-tables/virtual-tables/#basic-example"
            target="_blank"
            >虚拟表</a
          >
        </li>
      </ul>
    </div>
    <div>
      <h2>quasar</h2>
      <ul>
        <li>
          <a
            href="http://www.quasarchs.com/vue-components/table#%E8%99%9A%E6%8B%9F%E6%BB%9A%E5%8A%A8"
            target="_blank"
            >table</a
          >滚动效果不好
        </li>
      </ul>
    </div>
  </div>
</template>
