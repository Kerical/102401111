(function () {
  'use strict';

  function render(posts, params) {
    const options = {
      type: params.get('type') || 'all',
      category: params.get('category') || '',
      place: params.get('place') || ''
    };
    document.querySelectorAll('#home-tabs button').forEach(function (button) {
      const active = button.dataset.type === options.type;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    CampusUI.setCategories(document.getElementById('home-category'), posts, options.category);
    document.getElementById('home-place').value = options.place;
    const visiblePosts = CampusPosts.filterPosts(posts, options);
    document.getElementById('home-count').textContent = '共 ' + visiblePosts.length + ' 条进行中的信息 · 按发布时间排序';
    CampusUI.renderList(document.getElementById('home-list'), visiblePosts, 'home?' + params.toString());
  }

  function applyFilters(type) {
    const params = new URLSearchParams();
    const selected = document.querySelector('#home-tabs [aria-pressed="true"]');
    params.set('type', type || (selected ? selected.dataset.type : 'all'));
    const category = document.getElementById('home-category').value;
    const place = document.getElementById('home-place').value.trim();
    if (category) params.set('category', category);
    if (place) params.set('place', place);
    CampusUI.navigate('home?' + params.toString());
  }

  function init() {
    document.getElementById('home-tabs').addEventListener('click', function (event) {
      const button = event.target.closest('button[data-type]');
      if (button) applyFilters(button.dataset.type);
    });
    document.getElementById('home-filter-form').addEventListener('submit', function (event) {
      event.preventDefault();
      applyFilters();
    });
    document.getElementById('home-category').addEventListener('change', function () { applyFilters(); });
    document.getElementById('home-reset').addEventListener('click', function () { CampusUI.navigate('home'); });
  }

  window.CampusHome = { init, render };
})();
