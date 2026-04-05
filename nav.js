function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('open');
}

function toggleTree(el) {
  el.parentElement.classList.toggle('open');
}

// Auto-expand tree branch if current hash matches a child link
document.addEventListener('DOMContentLoaded', function () {
  var hash = window.location.hash;
  if (!hash) return;
  var links = document.querySelectorAll('.tree-children a');
  links.forEach(function (a) {
    if (a.getAttribute('href') && a.getAttribute('href').endsWith(hash)) {
      var node = a.closest('.tree-node');
      while (node) {
        node.classList.add('open');
        node = node.parentElement.closest('.tree-node');
      }
    }
  });
});