<div class="child-component" style={'background-color:'+ color}>
  <header>
    <slot name="header">childComponent</slot>
  </header>
  <main>
    <slot></slot>
  </main>
</div>
<style>
  .child-component{
    border: 1px solid #ddd;
    border-radius: 5px;
  }
  header{
    padding: 5px;
    background-color: #eee;
  }
  main{
    padding:5px;
  }
</style>
<script>
  export let color = "azure";
</script>