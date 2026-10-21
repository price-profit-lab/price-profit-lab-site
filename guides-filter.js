'use strict';
(function () {
  const finder = document.getElementById('guide-finder');
  if (!finder) return;
  const form = document.getElementById('guideSearchForm');
  const query = document.getElementById('guideQuery');
  const category = document.getElementById('guideCategory');
  const reset = document.getElementById('guideReset');
  const status = document.getElementById('guideSearchStatus');
  const empty = document.getElementById('guideNoResults');
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase('ja').trim();
  const groups = Array.from(document.querySelectorAll('[data-guide-group]')).map(section => ({
    section,
    category: section.getAttribute('data-guide-group'),
    entries: Array.from(section.querySelectorAll('[data-guide-entry]')).map(item => ({
      item,
      text: normalize(section.querySelector('h2').textContent + ' ' + item.textContent)
    }))
  }));
  const total = groups.reduce((sum, group) => sum + group.entries.length, 0);
  function update() {
    const words = normalize(query.value).split(/\s+/).filter(Boolean);
    let count = 0;
    for (const group of groups) {
      let visible = 0;
      for (const entry of group.entries) {
        const matches = (category.value === 'all' || category.value === group.category) &&
          words.every(word => entry.text.includes(word));
        entry.item.hidden = !matches;
        if (matches) visible++;
      }
      group.section.hidden = visible === 0;
      count += visible;
    }
    status.textContent = total + '件の案内のうち' + count + '件を表示しています。';
    empty.hidden = count !== 0;
  }
  // Filtering stays in this document: no URL changes, storage, network or analytics calls.
  form.addEventListener('submit', event => { event.preventDefault(); update(); });
  query.addEventListener('input', update);
  category.addEventListener('change', update);
  reset.addEventListener('click', () => {
    query.value = '';
    category.value = 'all';
    update();
    query.focus();
  });
  update();
  finder.hidden = false;
})();
