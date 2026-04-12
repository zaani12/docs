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

// ── SEARCH ────────────────────────────────────────────────────────────────────

var SEARCH_INDEX = [
  // Home
  { title: 'Home', url: 'index.html', section: '', desc: 'OpsPilot Help Center — quick start, feature overview' },
  // Getting Started
  { title: 'Getting Started', url: 'getting-started.html', section: '', desc: 'Install OpsPilot, first-time setup, quick tour' },
  { title: 'Installing OpsPilot', url: 'getting-started.html#installing-opspilot', section: 'Getting Started', desc: 'Install from Shopify App Store, permissions, redirect to dashboard' },
  { title: 'First-Time Setup', url: 'getting-started.html#first-time-setup', section: 'Getting Started', desc: 'Default statuses, timezone detection, sample templates' },
  { title: 'Your First Note', url: 'getting-started.html#your-first-note', section: 'Getting Started', desc: 'Create a note in under 30 seconds' },
  { title: 'Your First Task', url: 'getting-started.html#your-first-task', section: 'Getting Started', desc: 'Create a task, assign it, set due date' },
  { title: 'Your First Workflow', url: 'getting-started.html#your-first-workflow', section: 'Getting Started', desc: 'Build a workflow from a template or from scratch' },
  { title: 'Inviting Team Members', url: 'getting-started.html#inviting-team-members', section: 'Getting Started', desc: 'Shopify staff auto-detected, assign roles' },
  // Dashboard
  { title: 'Dashboard', url: 'dashboard.html', section: '', desc: 'Real-time store health, KPIs, task overview, automation performance' },
  { title: 'KPI Quick Stats', url: 'dashboard.html#kpi-quick-stats', section: 'Dashboard', desc: 'Overdue fulfillment, abandoned checkouts, pending payment, out of stock' },
  { title: 'Task Overview', url: 'dashboard.html#task-overview', section: 'Dashboard', desc: 'Open tasks, overdue tasks, due today' },
  { title: 'Automation Impact', url: 'dashboard.html#automation-impact', section: 'Dashboard', desc: 'Tasks created by automation, time saved, success rate' },
  { title: 'Charts', url: 'dashboard.html#charts', section: 'Dashboard', desc: 'Priority distribution, status breakdown, staff workload, workflow trends' },
  { title: 'Recent Activity', url: 'dashboard.html#recent-activity', section: 'Dashboard', desc: 'Latest team and automation events feed' },
  { title: 'Upcoming Scheduled Workflows', url: 'dashboard.html#upcoming-workflows', section: 'Dashboard', desc: 'See which scheduled workflows are queued next' },
  { title: 'Changing the Date Range', url: 'dashboard.html#changing-the-date-range', section: 'Dashboard', desc: 'Today, last week, last month, last 3 months' },
  // Notes
  { title: 'Notes', url: 'notes.html', section: '', desc: 'Attach comments and context to orders, products, and customers' },
  { title: 'Creating a Note', url: 'notes.html#creating-a-note', section: 'Notes', desc: 'Choose entity type, rich text editor, save' },
  { title: 'Attaching Files', url: 'notes.html#attaching-files', section: 'Notes', desc: 'Upload images, PDFs, documents to notes' },
  { title: 'Pinning Notes', url: 'notes.html#pinning-notes', section: 'Notes', desc: 'Pin important notes to top of list' },
  { title: 'Converting Notes to Tasks', url: 'notes.html#converting-notes-to-tasks', section: 'Notes', desc: 'Turn one or more notes into tracked tasks' },
  { title: 'Searching & Filtering Notes', url: 'notes.html#searching-filtering', section: 'Notes', desc: 'Filter by entity type, author, date range' },
  // Tasks
  { title: 'Tasks', url: 'tasks.html', section: '', desc: 'Track what needs to be done, by whom, and when' },
  { title: 'Creating a Task', url: 'tasks.html#creating-a-task', section: 'Tasks', desc: 'Title, priority, due date, assignee, description' },
  { title: 'Priority Levels', url: 'tasks.html#priority-levels', section: 'Tasks', desc: 'Low, Medium, High, Urgent' },
  { title: 'Task Statuses', url: 'tasks.html#task-statuses', section: 'Tasks', desc: 'Pending, In Progress, On Hold, Completed, Cancelled, Archived' },
  { title: 'Table View', url: 'tasks.html#table-view', section: 'Tasks', desc: 'Sortable spreadsheet-style list of tasks' },
  { title: 'Kanban Board View', url: 'tasks.html#kanban-board-view', section: 'Tasks', desc: 'Drag-and-drop board organized by status' },
  { title: 'Task Timeline', url: 'tasks.html#task-timeline', section: 'Tasks', desc: 'Full history of status changes and edits per task' },
  { title: 'Auto-Created Tasks', url: 'tasks.html#auto-created-tasks', section: 'Tasks', desc: 'Tasks created automatically by workflows' },
  // Workflows
  { title: 'Workflows', url: 'workflows.html', section: '', desc: 'Automate store operations with triggers, conditions, and actions' },
  { title: 'Creating a Workflow', url: 'workflows.html#creating-a-workflow', section: 'Workflows', desc: 'Step-by-step: choose type, name, trigger, conditions, actions' },
  { title: 'Event-Based Triggers', url: 'workflows.html#event-based-triggers', section: 'Workflows', desc: 'Order Created, Order Updated, Checkout Abandoned, Inventory, Customer, Product, Manual' },
  { title: 'Scheduled Trigger', url: 'workflows.html#scheduled-trigger', section: 'Workflows', desc: 'Run workflows on a fixed schedule' },
  { title: 'Conditions', url: 'workflows.html#conditions', section: 'Workflows', desc: 'Filter when the workflow runs using AND/OR logic' },
  { title: 'Actions', url: 'workflows.html#actions', section: 'Workflows', desc: 'Create Task, Create Note, Send Email, Send Slack, Add to Google Sheet' },
  { title: 'Create Task Action', url: 'workflows.html#create-task', section: 'Workflows', desc: 'Auto-create tasks from workflow with title, priority, assignee' },
  { title: 'Send Email Action', url: 'workflows.html#send-email', section: 'Workflows', desc: 'Send HTML email to customer, staff, or custom address' },
  { title: 'Send Slack Message', url: 'workflows.html#send-slack-message', section: 'Workflows', desc: 'Post Slack message with Block Kit formatting' },
  { title: 'Add to Google Sheet', url: 'workflows.html#add-to-google-sheet', section: 'Workflows', desc: 'Append a row to a Google Sheets spreadsheet' },
  { title: 'Delayed Actions', url: 'workflows.html#delayed-actions', section: 'Workflows', desc: 'Set a delay before an action runs: minutes, hours, or days' },
  { title: 'Deduplication', url: 'workflows.html#deduplication', section: 'Workflows', desc: 'Prevent duplicate tasks, emails, and Slack messages' },
  { title: 'Scheduled Workflows', url: 'workflows.html#scheduled-workflows', section: 'Workflows', desc: 'Hourly, daily, weekly, monthly, custom interval batch workflows' },
  { title: 'Workflow Templates', url: 'workflows.html#workflow-templates', section: 'Workflows', desc: '40+ pre-built workflow templates for orders, customers, inventory, and more' },
  { title: 'Template Catalog', url: 'workflows.html#template-catalog', section: 'Workflows', desc: 'Full list of available workflow templates by category' },
  { title: 'Testing a Workflow', url: 'workflows.html#testing-a-workflow', section: 'Workflows', desc: 'Test with real data without waiting for a store event' },
  // Template Variables
  { title: 'Template Variables', url: 'template-variables.html', section: '', desc: '60+ dynamic variables for workflow actions like {{order_number}}, {{customer_name}}' },
  // Settings
  { title: 'Settings', url: 'settings.html', section: '', desc: 'Configure task preferences, team, custom statuses, timezone, integrations' },
  { title: 'Task Preferences', url: 'settings.html#task-preferences', section: 'Settings', desc: 'Default assignment, default view, auto-archive' },
  { title: 'Auto-Archive', url: 'settings.html#auto-archive', section: 'Settings', desc: 'Automatically archive completed tasks after X days' },
  { title: 'Task Statuses (Settings)', url: 'settings.html#task-statuses', section: 'Settings', desc: 'Create and manage custom task statuses' },
  { title: 'Creating Custom Statuses', url: 'settings.html#creating-custom-statuses', section: 'Settings', desc: 'Add custom status with display name, internal value, closed flag' },
  { title: 'Dashboard Date Range', url: 'settings.html#dashboard-date-range', section: 'Settings', desc: 'Set default time period for dashboard statistics' },
  { title: 'Timezone', url: 'settings.html#timezone', section: 'Settings', desc: 'Set timezone for scheduled workflows and time displays' },
  { title: 'Team Management', url: 'settings.html#team-management', section: 'Settings', desc: 'View and manage team members and roles' },
  { title: 'Roles & Permissions', url: 'settings.html#roles-and-permissions', section: 'Settings', desc: 'Admin vs User role permissions matrix' },
  // Integrations
  { title: 'Integrations', url: 'integrations.html', section: '', desc: 'Connect Email, Slack, and Google Sheets to workflows' },
  { title: 'Email Integration', url: 'integrations.html#email-integration', section: 'Integrations', desc: 'Set up custom domain, DNS records, sender configuration' },
  { title: 'Slack Integration', url: 'integrations.html#slack-integration', section: 'Integrations', desc: 'Bot Token or Webhook URL to post to Slack channels' },
  { title: 'Google Sheets Integration', url: 'integrations.html#google-sheets-integration', section: 'Integrations', desc: 'Service account, spreadsheet ID, auto-append rows' },
  // Activity History
  { title: 'Activity History', url: 'activity.html', section: '', desc: 'Full audit log of all app operations — who did what and when' },
  { title: 'Filtering Activity', url: 'activity.html#filtering-activity', section: 'Activity History', desc: 'Filter by entity type, action type, user, date range' },
  { title: 'Workflow Execution Logs', url: 'activity.html#workflow-execution-logs', section: 'Activity History', desc: 'See every workflow run with status, actions, and payload' },
  // FAQ
  { title: 'FAQ & Troubleshooting', url: 'faq.html', section: '', desc: 'Common questions about notes, tasks, workflows, and setup' },
  { title: 'Workflow Not Triggering', url: 'faq.html#workflow-not-triggering', section: 'FAQ', desc: 'Check active status, conditions, trigger type, plan limits, and failures' },
  { title: 'Emails Not Being Sent', url: 'faq.html#emails-not-sent', section: 'FAQ', desc: 'Email integration, DNS verification, plan requirement, deduplication' },
  { title: 'Paused Due to Failure', url: 'faq.html#paused-due-to-failure', section: 'FAQ', desc: 'Fix failed workflows and re-enable them' },
  // Advanced Troubleshooting
  { title: 'Advanced Troubleshooting', url: 'troubleshooting.html', section: '', desc: 'Detailed error codes, integration debugging, rate limits, recovery steps' },
  { title: 'Workflow Error States', url: 'troubleshooting.html#workflow-errors', section: 'Troubleshooting', desc: 'FAILED, SKIPPED, QUEUED — causes and fixes' },
  { title: 'Slack Setup Errors', url: 'troubleshooting.html#slack-errors', section: 'Troubleshooting', desc: 'Missing token, wrong channel, missing scopes' },
  { title: 'Email Delivery Failures', url: 'troubleshooting.html#email-errors', section: 'Troubleshooting', desc: 'DNS not propagated, unverified domain, rate limits' },
  { title: 'Google Sheets Errors', url: 'troubleshooting.html#sheets-errors', section: 'Troubleshooting', desc: 'Missing service account, unshared spreadsheet, missing columns' },
  { title: 'Rate Limits & Quotas', url: 'troubleshooting.html#rate-limits', section: 'Troubleshooting', desc: 'Monthly run limits, dedup window, payload size limits' },
  // API Reference
  { title: 'API Reference', url: 'api-reference.html', section: '', desc: 'API endpoints, authentication, webhooks, edge cases' },
  { title: 'API Endpoints', url: 'api-reference.html#api-endpoints', section: 'API Reference', desc: 'Scheduled workflows, item-actions, health, webhooks' },
  { title: 'Webhook Events', url: 'api-reference.html#webhooks', section: 'API Reference', desc: 'Shopify webhook handlers: order, inventory, customer, uninstall' },
  { title: 'Authentication & Scopes', url: 'api-reference.html#authentication', section: 'API Reference', desc: 'OAuth 2.0, required scopes, session handling' },
  { title: 'Edge Cases & Special Flows', url: 'api-reference.html#edge-cases', section: 'API Reference', desc: 'Billing edge cases, workflow execution edge cases, integration edge cases' },
];

document.addEventListener('DOMContentLoaded', function () {
  var input = document.getElementById('doc-search');
  var resultsBox = document.getElementById('search-results');
  if (!input || !resultsBox) return;

  input.addEventListener('input', function () {
    var q = input.value.trim().toLowerCase();
    if (!q) { resultsBox.style.display = 'none'; resultsBox.innerHTML = ''; return; }

    var matches = SEARCH_INDEX.filter(function (item) {
      return (item.title + ' ' + item.section + ' ' + item.desc).toLowerCase().includes(q);
    }).slice(0, 8);

    if (!matches.length) {
      resultsBox.innerHTML = '<div class="search-no-results">No results for &ldquo;' + escHtml(input.value) + '&rdquo;</div>';
      resultsBox.style.display = 'block';
      return;
    }

    resultsBox.innerHTML = matches.map(function (item) {
      var breadcrumb = item.section ? '<span class="sr-section">' + escHtml(item.section) + '</span> ' : '';
      return '<a class="search-result-item" href="' + item.url + '">'
        + '<div class="sr-title">' + breadcrumb + escHtml(item.title) + '</div>'
        + '<div class="sr-desc">' + escHtml(item.desc) + '</div>'
        + '</a>';
    }).join('');
    resultsBox.style.display = 'block';
  });

  document.addEventListener('click', function (e) {
    if (!input.contains(e.target) && !resultsBox.contains(e.target)) {
      resultsBox.style.display = 'none';
    }
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { resultsBox.style.display = 'none'; input.blur(); }
  });
});

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
