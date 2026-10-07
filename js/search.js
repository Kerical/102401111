(function () {
  'use strict';

  function applySearch(keyword) {
    const params = new URLSearchParams();
    const input = document.getElementById('search-keyword');
    if (typeof keyword === 'string') input.value = keyword;
    const values = {
      keyword: input.value.trim(),
      type: document.getElementById('search-type').value,
      category: document.getElementById('search-category').value,
      place: document.getElementById('search-place').value.trim()
    };
    Object.entries(values).forEach(function ([key, value]) {
      if (value && value !== 'all') params.set(key, value);
    });
    if (document.getElementById('search-finished').checked) params.set('finished', '1');
    CampusUI.navigate('search' + (params.size ? '?' + params.toString() : ''));
  }

  function render(posts, params) {
    const options = {
      keyword: params.get('keyword') || '',
      type: params.get('type') || 'all',
      category: params.get('category') || '',
      place: params.get('place') || '',
      includeFinished: params.get('finished') === '1'
    };
    document.getElementById('search-keyword').value = options.keyword;
    document.getElementById('search-type').value = options.type;
    CampusUI.setCategories(document.getElementById('search-category'), posts, options.category);
    document.getElementById('search-place').value = options.place;
    document.getElementById('search-finished').checked = options.includeFinished;
    const results = CampusPosts.filterPosts(posts, options);
    const keyword = options.keyword.trim();
    document.getElementById('search-note').textContent = (keyword ? '“' + keyword + '”：' : '当前条件下：') +
      '找到 ' + results.length + ' 条信息' + (options.includeFinished ? '，包含已结束信息' : '，仅显示进行中的信息');
    CampusUI.renderList(document.getElementById('search-list'), results, 'search?' + params.toString());
  }

  function init() {
    document.getElementById('search-form').addEventListener('submit', function (event) {
      event.preventDefault();
      applySearch();
    });
    document.getElementById('search-chips').addEventListener('click', function (event) {
      const button = event.target.closest('button[data-keyword]');
      if (button) applySearch(button.dataset.keyword);
    });
    ['search-type', 'search-category', 'search-finished'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', function () { applySearch(); });
    });
    document.getElementById('search-reset').addEventListener('click', function () { CampusUI.navigate('search'); });
  }

  window.CampusSearch = { init, render };
})();
