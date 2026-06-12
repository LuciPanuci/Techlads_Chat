<?php
/**
 * Plugin Name: Site Context Chat
 * Plugin URI: https://github.com/LuciPanuci/Techlads_Chat
 * Description: Markdown-backed AI chatbot widget powered by Supabase Edge Functions and Claude (BYOK).
 * Version: 0.1.5
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author: TechLads
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: site-context-chat
 */

if (!defined('ABSPATH')) {
    exit;
}

define('SCC_VERSION', '0.1.5');
define('SCC_PLUGIN_FILE', __FILE__);
define('SCC_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('SCC_PLUGIN_URL', plugin_dir_url(__FILE__));

final class Site_Context_Chat {
    const OPTION_GROUP = 'scc_settings_group';
    const OPTION_NAME = 'scc_settings';

    /** @var bool */
    private static $admin_shortcode_requested = false;

    /** @var bool */
    private static $widget_assets_enqueued = false;

    /** @var bool */
    private static $admin_assets_enqueued = false;

    public static function init(): void {
        require_once SCC_PLUGIN_DIR . 'includes/backend-setup-guide.php';

        add_action('admin_menu', [__CLASS__, 'register_settings_page']);
        add_action('admin_init', [__CLASS__, 'register_settings']);
        add_action('admin_enqueue_scripts', [__CLASS__, 'enqueue_admin_docs_styles']);
        add_action('wp_enqueue_scripts', [__CLASS__, 'enqueue_frontend_assets'], 20);
        add_action('wp_footer', [__CLASS__, 'render_widget_mount'], 5);
        add_shortcode('site_context_chat_admin', [__CLASS__, 'render_admin_shortcode']);
        add_filter('the_posts', [__CLASS__, 'detect_admin_shortcode_in_posts'], 10, 2);
        add_filter('plugin_action_links_' . plugin_basename(SCC_PLUGIN_FILE), [__CLASS__, 'plugin_action_links']);
    }

    /**
     * @param array<string, string> $links
     * @return array<string, string>
     */
    public static function plugin_action_links($links): array {
        $settings = sprintf(
            '<a href="%s">%s</a>',
            esc_url(admin_url('options-general.php?page=site-context-chat')),
            esc_html__('Settings', 'site-context-chat')
        );
        array_unshift($links, $settings);
        return $links;
    }

    /** @return array<string, mixed> */
    public static function get_settings(): array {
        $defaults = [
            'enabled' => '1',
            'supabase_url' => '',
            'supabase_anon_key' => '',
            'site_id' => 'default',
            'hide_fab_selector' => '',
            'admin_page_slug' => 'chat-admin',
            'theme' => 'dark',
            'custom_css' => '',
        ];

        $stored = get_option(self::OPTION_NAME, []);
        if (!is_array($stored)) {
            $stored = [];
        }

        return array_merge($defaults, $stored);
    }

    public static function enqueue_admin_docs_styles(string $hook_suffix): void {
        if ($hook_suffix !== 'settings_page_site-context-chat') {
            return;
        }

        $path = SCC_PLUGIN_DIR . 'wp-admin-docs.css';
        if (!file_exists($path)) {
            return;
        }

        wp_enqueue_style(
            'scc-admin-docs',
            SCC_PLUGIN_URL . 'wp-admin-docs.css',
            [],
            (string) filemtime($path)
        );
    }

    public static function register_settings_page(): void {
        add_options_page(
            __('Site Context Chat', 'site-context-chat'),
            __('Site Context Chat', 'site-context-chat'),
            'manage_options',
            'site-context-chat',
            [__CLASS__, 'render_settings_page']
        );
    }

    public static function register_settings(): void {
        register_setting(
            self::OPTION_GROUP,
            self::OPTION_NAME,
            [
                'type' => 'array',
                'sanitize_callback' => [__CLASS__, 'sanitize_settings'],
                'default' => self::get_settings(),
            ]
        );
    }

    /**
     * @param array<string, mixed>|mixed $input
     * @return array<string, string>
     */
    public static function sanitize_settings($input): array {
        if (!is_array($input)) {
            return self::get_settings();
        }

        $clean = self::get_settings();

        $clean['enabled'] = !empty($input['enabled']) ? '1' : '0';

        $url = trim((string) ($input['supabase_url'] ?? ''));
        $clean['supabase_url'] = $url !== '' ? untrailingslashit(esc_url_raw($url)) : '';

        $clean['supabase_anon_key'] = sanitize_text_field(trim((string) ($input['supabase_anon_key'] ?? '')));

        $site_id = trim((string) ($input['site_id'] ?? 'default'));
        $clean['site_id'] = $site_id !== '' ? sanitize_key($site_id) : 'default';
        if ($clean['site_id'] === '') {
            $clean['site_id'] = 'default';
        }

        $clean['hide_fab_selector'] = sanitize_text_field(trim((string) ($input['hide_fab_selector'] ?? '')));
        $clean['admin_page_slug'] = sanitize_title(trim((string) ($input['admin_page_slug'] ?? 'chat-admin'))) ?: 'chat-admin';

        $theme = sanitize_key((string) ($input['theme'] ?? 'dark'));
        $clean['theme'] = in_array($theme, ['dark', 'light', 'auto'], true) ? $theme : 'dark';

        $clean['custom_css'] = self::sanitize_custom_css((string) ($input['custom_css'] ?? ''));

        return $clean;
    }

    private static function sanitize_custom_css(string $css): string {
        $css = wp_check_invalid_utf8($css);
        $css = wp_strip_all_tags($css);
        $css = preg_replace('/<\/style/i', '', $css);
        $css = preg_replace('/<script\b[^>]*>/i', '', $css);
        $css = preg_replace('/expression\s*\(/i', '', $css);
        $css = preg_replace('/javascript\s*:/i', '', $css);
        $css = preg_replace('/@import/i', '', $css);
        return trim($css);
    }

    private static function initial_theme_attribute(): string {
        $theme = self::get_settings()['theme'] ?? 'dark';
        if ($theme === 'light') {
            return 'light';
        }
        return 'dark';
    }

    public static function is_widget_configured(): bool {
        $settings = self::get_settings();
        return $settings['supabase_url'] !== '' && $settings['supabase_anon_key'] !== '';
    }

    public static function is_widget_enabled(): bool {
        $settings = self::get_settings();
        return $settings['enabled'] === '1' && self::is_widget_configured();
    }

    public static function get_admin_page_url(): string {
        $settings = self::get_settings();
        $slug = $settings['admin_page_slug'] ?: 'chat-admin';

        $page = get_page_by_path($slug);
        if ($page instanceof WP_Post) {
            return get_permalink($page);
        }

        return home_url('/' . ltrim($slug, '/'));
    }

    public static function is_admin_page_request(): bool {
        if (self::$admin_shortcode_requested) {
            return true;
        }

        $settings = self::get_settings();
        $slug = $settings['admin_page_slug'] ?? 'chat-admin';

        if (is_page($slug)) {
            return true;
        }

        global $post;
        if ($post instanceof WP_Post && $post->post_name === $slug) {
            return true;
        }

        if ($post instanceof WP_Post && has_shortcode($post->post_content, 'site_context_chat_admin')) {
            return true;
        }

        return false;
    }

    /**
     * @param \WP_Post[] $posts
     * @return \WP_Post[]
     */
    public static function detect_admin_shortcode_in_posts($posts, $query) {
        if (empty($posts) || !is_array($posts)) {
            return $posts;
        }

        foreach ($posts as $post) {
            if (!empty($post->post_content) && has_shortcode($post->post_content, 'site_context_chat_admin')) {
                self::$admin_shortcode_requested = true;
                break;
            }
        }

        return $posts;
    }

    /** @return array<string, string> */
    private static function shared_script_config(): array {
        $settings = self::get_settings();

        return [
            'url' => $settings['supabase_url'],
            'anonKey' => $settings['supabase_anon_key'],
            'siteId' => $settings['site_id'] ?: 'default',
            'theme' => $settings['theme'] ?? 'dark',
        ];
    }

    private static function maybe_add_custom_css(string $handle): void {
        $css = trim(self::get_settings()['custom_css'] ?? '');
        if ($css === '') {
            return;
        }
        wp_add_inline_style($handle, $css);
    }

    private static function style_version(): string {
        $style_path = SCC_PLUGIN_DIR . 'assets/site-context-chat.css';
        return file_exists($style_path) ? (string) filemtime($style_path) : SCC_VERSION;
    }

    private static function enqueue_widget_assets(): void {
        if (self::$widget_assets_enqueued || !self::is_widget_enabled()) {
            return;
        }

        $widget_path = SCC_PLUGIN_DIR . 'assets/widget.js';
        if (!file_exists($widget_path)) {
            return;
        }

        self::$widget_assets_enqueued = true;
        $style_ver = self::style_version();

        wp_enqueue_style(
            'scc-widget',
            SCC_PLUGIN_URL . 'assets/site-context-chat.css',
            [],
            $style_ver
        );
        self::maybe_add_custom_css('scc-widget');

        wp_enqueue_script(
            'scc-widget',
            SCC_PLUGIN_URL . 'assets/widget.js',
            [],
            (string) filemtime($widget_path),
            true
        );

        $config = self::shared_script_config();
        $config['hideFabSelector'] = self::get_settings()['hide_fab_selector'];

        wp_localize_script('scc-widget', 'sccConfig', $config);
    }

    private static function enqueue_admin_assets(): void {
        if (self::$admin_assets_enqueued || !self::is_widget_configured() || !self::is_admin_page_request()) {
            return;
        }

        $admin_path = SCC_PLUGIN_DIR . 'assets/admin.js';
        if (!file_exists($admin_path)) {
            return;
        }

        self::$admin_assets_enqueued = true;
        $style_ver = self::style_version();

        wp_enqueue_style(
            'scc-admin',
            SCC_PLUGIN_URL . 'assets/site-context-chat.css',
            [],
            $style_ver
        );
        self::maybe_add_custom_css('scc-admin');

        $layout_path = SCC_PLUGIN_DIR . 'wp-admin-layout.css';
        if (file_exists($layout_path)) {
            wp_enqueue_style(
                'scc-admin-layout',
                SCC_PLUGIN_URL . 'wp-admin-layout.css',
                ['scc-admin'],
                (string) filemtime($layout_path)
            );
        }

        wp_enqueue_script(
            'scc-admin',
            SCC_PLUGIN_URL . 'assets/admin.js',
            [],
            (string) filemtime($admin_path),
            true
        );

        wp_localize_script('scc-admin', 'sccAdminConfig', self::shared_script_config());
    }

    public static function enqueue_frontend_assets(): void {
        global $post;
        if ($post instanceof WP_Post && has_shortcode($post->post_content, 'site_context_chat_admin')) {
            self::$admin_shortcode_requested = true;
        }

        self::enqueue_widget_assets();
        self::enqueue_admin_assets();
    }

    public static function render_widget_mount(): void {
        if (!self::is_widget_enabled()) {
            return;
        }

        printf(
            '<div id="scc-root" data-theme="%s"></div>',
            esc_attr(self::initial_theme_attribute())
        );
    }

    /** @return string */
    public static function render_admin_shortcode(): string {
        if (!self::is_widget_configured()) {
            return '<p class="scc-wp-notice">' . esc_html__(
                'Site Context Chat is not configured. Add your Supabase URL and anon key under Settings → Site Context Chat.',
                'site-context-chat'
            ) . '</p>';
        }

        self::$admin_shortcode_requested = true;
        self::enqueue_admin_assets();

        $fallback = esc_html__('Loading chat admin…', 'site-context-chat');
        $noscript = esc_html__(
            'Chat admin requires JavaScript. If this message persists, check that admin.js loaded (browser devtools → Network).',
            'site-context-chat'
        );

        return '<div id="scc-admin-root" class="scc-wp-admin-mount" data-theme="' . esc_attr(self::initial_theme_attribute()) . '">'
            . '<p class="scc-wp-loading">' . $fallback . '</p></div>'
            . '<noscript><p class="scc-wp-notice">' . $noscript . '</p></noscript>';
    }

    private static function custom_css_examples(): string {
        return <<<'CSS'
/* Brand accent — launcher ring, send button, links */
#scc-root {
  --scc-fab-accent: #6366f1;
}

/* Larger launcher */
#scc-root .scc-chat-fab {
  width: 4.25rem;
  height: 4.25rem;
}

/* Move launcher to bottom-left */
#scc-root .scc-chat-fab-wrap {
  right: auto;
  left: 1.5rem;
}

/* Rounder panel corners */
#scc-root .scc-panel-shell {
  border-radius: 1.25rem;
}

/* Light theme: softer panel shadow */
#scc-root[data-theme='light'] .scc-panel-shell {
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
}

/* Admin page: match your site background */
#scc-admin-root.scc-wp-admin-mount {
  padding: 1rem 0;
}
CSS;
    }

    public static function render_settings_page(): void {
        if (!current_user_can('manage_options')) {
            return;
        }

        $settings = self::get_settings();
        $admin_url = self::get_admin_page_url();
        $assets_built = file_exists(SCC_PLUGIN_DIR . 'assets/widget.js') && file_exists(SCC_PLUGIN_DIR . 'assets/admin.js');
        ?>
        <div class="wrap">
            <h1><?php echo esc_html__('Site Context Chat', 'site-context-chat'); ?></h1>

            <div class="notice notice-info inline" style="margin: 1em 0; padding: 1em;">
                <p><strong><?php echo esc_html__('Status', 'site-context-chat'); ?></strong></p>
                <ul style="list-style: disc; margin-left: 1.5em;">
                    <li><?php echo $assets_built ? '✅' : '❌'; ?> <?php echo esc_html__('Built assets (widget.js, admin.js)', 'site-context-chat'); ?></li>
                    <li><?php echo self::is_widget_configured() ? '✅' : '❌'; ?> <?php echo esc_html__('Supabase credentials saved', 'site-context-chat'); ?></li>
                    <li><?php echo $settings['enabled'] === '1' ? '✅' : '⚠️'; ?> <?php echo esc_html__('Widget enabled', 'site-context-chat'); ?></li>
                    <li><?php echo esc_html__('Admin page URL:', 'site-context-chat'); ?> <a href="<?php echo esc_url($admin_url); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html($admin_url); ?></a></li>
                </ul>
            </div>

            <?php if (!$assets_built) : ?>
                <div class="notice notice-error">
                    <p>
                        <?php echo esc_html__(
                            'Plugin assets are missing. From the package root run: npm run build:wp',
                            'site-context-chat'
                        ); ?>
                    </p>
                </div>
            <?php endif; ?>

            <form method="post" action="options.php">
                <?php settings_fields(self::OPTION_GROUP); ?>

                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><?php echo esc_html__('Enable widget', 'site-context-chat'); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="<?php echo esc_attr(self::OPTION_NAME); ?>[enabled]" value="1" <?php checked($settings['enabled'], '1'); ?> />
                                <?php echo esc_html__('Show chat widget on the public site', 'site-context-chat'); ?>
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="scc_supabase_url"><?php echo esc_html__('Supabase URL', 'site-context-chat'); ?></label></th>
                        <td>
                            <input type="url" class="regular-text" id="scc_supabase_url" name="<?php echo esc_attr(self::OPTION_NAME); ?>[supabase_url]" value="<?php echo esc_attr($settings['supabase_url']); ?>" placeholder="https://YOUR_PROJECT.supabase.co" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="scc_supabase_anon_key"><?php echo esc_html__('Supabase anon key', 'site-context-chat'); ?></label></th>
                        <td>
                            <input type="text" class="regular-text code" id="scc_supabase_anon_key" name="<?php echo esc_attr(self::OPTION_NAME); ?>[supabase_anon_key]" value="<?php echo esc_attr($settings['supabase_anon_key']); ?>" autocomplete="off" />
                            <p class="description"><?php echo esc_html__('Public anon key (starts with eyJ…). Stored in WordPress options.', 'site-context-chat'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="scc_site_id"><?php echo esc_html__('Site ID', 'site-context-chat'); ?></label></th>
                        <td>
                            <input type="text" class="regular-text" id="scc_site_id" name="<?php echo esc_attr(self::OPTION_NAME); ?>[site_id]" value="<?php echo esc_attr($settings['site_id']); ?>" />
                            <p class="description"><?php echo esc_html__('Usually "default" unless you configured multiple sites in Supabase.', 'site-context-chat'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="scc_hide_fab_selector"><?php echo esc_html__('Hide FAB selector (optional)', 'site-context-chat'); ?></label></th>
                        <td>
                            <input type="text" class="regular-text" id="scc_hide_fab_selector" name="<?php echo esc_attr(self::OPTION_NAME); ?>[hide_fab_selector]" value="<?php echo esc_attr($settings['hide_fab_selector']); ?>" placeholder="#hero" />
                            <p class="description"><?php echo esc_html__('CSS selector — hide the chat button while this element is visible (e.g. homepage hero).', 'site-context-chat'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="scc_admin_page_slug"><?php echo esc_html__('Admin page slug', 'site-context-chat'); ?></label></th>
                        <td>
                            <input type="text" class="regular-text" id="scc_admin_page_slug" name="<?php echo esc_attr(self::OPTION_NAME); ?>[admin_page_slug]" value="<?php echo esc_attr($settings['admin_page_slug']); ?>" />
                            <p class="description">
                                <?php echo esc_html__(
                                    'Create a page with this slug. Use a Shortcode block (not a plain paragraph) containing: [site_context_chat_admin]',
                                    'site-context-chat'
                                ); ?>
                            </p>
                        </td>
                    </tr>
                </table>

                <h2 class="title"><?php echo esc_html__('Appearance', 'site-context-chat'); ?></h2>
                <p class="description">
                    <?php echo esc_html__('Widget and chat admin styling. Brand colours from the Supabase admin panel still apply via --scc-fab-accent.', 'site-context-chat'); ?>
                </p>

                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="scc_theme"><?php echo esc_html__('Theme', 'site-context-chat'); ?></label></th>
                        <td>
                            <select id="scc_theme" name="<?php echo esc_attr(self::OPTION_NAME); ?>[theme]">
                                <option value="dark" <?php selected($settings['theme'], 'dark'); ?>><?php echo esc_html__('Dark (default)', 'site-context-chat'); ?></option>
                                <option value="light" <?php selected($settings['theme'], 'light'); ?>><?php echo esc_html__('Light', 'site-context-chat'); ?></option>
                                <option value="auto" <?php selected($settings['theme'], 'auto'); ?>><?php echo esc_html__('Auto — match visitor OS', 'site-context-chat'); ?></option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="scc_custom_css"><?php echo esc_html__('Custom CSS', 'site-context-chat'); ?></label></th>
                        <td>
                            <textarea id="scc_custom_css" name="<?php echo esc_attr(self::OPTION_NAME); ?>[custom_css]" rows="10" class="large-text code"><?php echo esc_textarea($settings['custom_css']); ?></textarea>
                            <p class="description">
                                <?php echo esc_html__('Optional. Scope rules to #scc-root (widget) or #scc-admin-root (admin page).', 'site-context-chat'); ?>
                            </p>
                            <details style="margin-top: 0.75em; max-width: 42rem;">
                                <summary style="cursor: pointer; font-weight: 600;"><?php echo esc_html__('CSS examples (click to expand)', 'site-context-chat'); ?></summary>
                                <pre class="code" style="margin-top: 0.75em; padding: 1em; background: #f6f7f7; overflow-x: auto; white-space: pre-wrap;"><?php echo esc_html(self::custom_css_examples()); ?></pre>
                            </details>
                        </td>
                    </tr>
                </table>

                <?php submit_button(); ?>
            </form>

            <hr />

            <h2><?php echo esc_html__('Chat admin', 'site-context-chat'); ?></h2>
            <p><?php echo esc_html__('Manage markdown context, appearance, and conversations. Unlock with your SITE_CHAT_ADMIN_SECRET.', 'site-context-chat'); ?></p>
            <p>
                <a class="button button-secondary" href="<?php echo esc_url($admin_url); ?>" target="_blank" rel="noopener noreferrer">
                    <?php echo esc_html__('Open chat admin', 'site-context-chat'); ?> ↗
                </a>
            </p>

            <hr />

            <h2><?php echo esc_html__('Setup guide', 'site-context-chat'); ?></h2>
            <?php site_context_chat_render_backend_setup_guide($admin_url); ?>
        </div>
        <?php
    }
}

Site_Context_Chat::init();
