</main>
<?php $appVersion = defined('APP_VERSION') ? APP_VERSION : '1.0'; ?>
<footer class="app-footer">
  <div class="app-footer__inner">
    <small>&copy; <?php echo date('Y'); ?> <?php echo sanitize(APP_TITLE); ?> · Built for modern operations</small>
    <span class="app-footer__version">v<?php echo sanitize($appVersion); ?></span>
  </div>
</footer>
</div>
</div>
</body>
</html>
