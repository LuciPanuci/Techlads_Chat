<?php
/**
 * Embedded setup documentation for Settings → Site Context Chat.
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * @param string $admin_url Chat admin page URL for inline links.
 */
function site_context_chat_render_backend_setup_guide(string $admin_url): void {
    $repo = 'https://github.com/LuciPanuci/Techlads_Chat';
    ?>
    <div class="scc-setup-guide">
        <p class="scc-setup-guide__intro">
            <?php
            echo wp_kses_post(
                sprintf(
                    /* translators: %s: GitHub repository URL */
                    __('Install the plugin first, then connect Supabase + Claude. Full guide with screenshots: <a href="%s/blob/main/docs/BACKEND-SETUP.md" target="_blank" rel="noopener noreferrer">BACKEND-SETUP.md on GitHub</a>.', 'site-context-chat'),
                    esc_url($repo)
                )
            );
            ?>
        </p>

        <details>
            <summary>
                <?php echo esc_html__('Part 1 — WordPress plugin', 'site-context-chat'); ?>
                <span class="scc-setup-guide__meta"><?php echo esc_html__('~5 min', 'site-context-chat'); ?></span>
            </summary>
            <div class="scc-setup-guide__body">
                <ol>
                    <li>
                        <?php
                        echo wp_kses_post(
                            sprintf(
                                /* translators: %s: GitHub repository URL */
                                __('Download <code>site-context-chat.zip</code> from <a href="%s" target="_blank" rel="noopener noreferrer">GitHub</a>.', 'site-context-chat'),
                                esc_url($repo)
                            )
                        );
                        ?>
                    </li>
                    <li><?php echo esc_html__('Plugins → Add New → Upload Plugin → Install → Activate.', 'site-context-chat'); ?></li>
                    <li>
                        <?php echo esc_html__('Pages → Add New → slug e.g. chat-admin → Shortcode block:', 'site-context-chat'); ?>
                        <code>[site_context_chat_admin]</code> → <?php echo esc_html__('Publish.', 'site-context-chat'); ?>
                    </li>
                    <li><?php echo esc_html__('Optional now: Theme and Custom CSS on this settings page.', 'site-context-chat'); ?></li>
                </ol>
                <p><em><?php echo esc_html__('The chat button will not reply until Part 2 is complete — that is expected.', 'site-context-chat'); ?></em></p>
            </div>
        </details>

        <details open>
            <summary>
                <?php echo esc_html__('Part 2 — Backend (Supabase + Claude)', 'site-context-chat'); ?>
                <span class="scc-setup-guide__meta"><?php echo esc_html__('~30–45 min', 'site-context-chat'); ?></span>
            </summary>
            <div class="scc-setup-guide__body">
                <p><?php echo esc_html__('Use the Supabase dashboard for SQL and secrets. Use the CLI once to deploy edge functions (or ask your developer for Step 2.4 only).', 'site-context-chat'); ?></p>

                <table class="widefat striped">
                    <thead>
                        <tr>
                            <th><?php echo esc_html__('Step', 'site-context-chat'); ?></th>
                            <th><?php echo esc_html__('Where', 'site-context-chat'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><?php echo esc_html__('Create project', 'site-context-chat'); ?></td>
                            <td><?php echo esc_html__('Supabase dashboard', 'site-context-chat'); ?></td>
                        </tr>
                        <tr>
                            <td><?php echo esc_html__('Database tables', 'site-context-chat'); ?></td>
                            <td><?php echo esc_html__('SQL Editor — paste migration files', 'site-context-chat'); ?></td>
                        </tr>
                        <tr>
                            <td><?php echo esc_html__('Secrets', 'site-context-chat'); ?></td>
                            <td><?php echo esc_html__('Project Settings → Edge Functions → Secrets', 'site-context-chat'); ?></td>
                        </tr>
                        <tr>
                            <td><?php echo esc_html__('Deploy functions', 'site-context-chat'); ?></td>
                            <td><?php echo esc_html__('Terminal — Supabase CLI', 'site-context-chat'); ?></td>
                        </tr>
                    </tbody>
                </table>

                <h4><?php echo esc_html__('Step 2.1 — Create a Supabase project', 'site-context-chat'); ?></h4>
                <ol>
                    <li>
                        <?php
                        echo wp_kses_post(
                            __('<a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">supabase.com/dashboard</a> → New project → wait until Active.', 'site-context-chat')
                        );
                        ?>
                    </li>
                    <li>
                        <?php echo esc_html__('Save: Project URL, anon public key, and Project ref (Settings → API / General).', 'site-context-chat'); ?>
                    </li>
                </ol>
                <p class="description"><?php echo esc_html__('Never put the service_role key in WordPress.', 'site-context-chat'); ?></p>

                <h4><?php echo esc_html__('Step 2.2 — Run SQL migrations', 'site-context-chat'); ?></h4>
                <p><?php echo esc_html__('SQL Editor → New query. From the GitHub repo, run each file in order:', 'site-context-chat'); ?></p>
                <ol>
                    <li><code>supabase/migrations/20250610000000_site_context_chat.sql</code></li>
                    <li><code>supabase/migrations/20250610120000_site_chat_inquiries.sql</code></li>
                    <li><code>supabase/migrations/20250610220000_update_welcome_message.sql</code></li>
                    <li><code>supabase/migrations/20250610230000_list_chat_sessions.sql</code></li>
                </ol>
                <p class="description"><?php echo esc_html__('Table Editor should show site_chat_sites with a default row.', 'site-context-chat'); ?></p>

                <h4><?php echo esc_html__('Step 2.3 — Edge Function secrets', 'site-context-chat'); ?></h4>
                <table class="widefat striped">
                    <thead>
                        <tr>
                            <th><?php echo esc_html__('Secret', 'site-context-chat'); ?></th>
                            <th><?php echo esc_html__('Required', 'site-context-chat'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td><code>ANTHROPIC_API_KEY</code></td><td><?php echo esc_html__('Yes', 'site-context-chat'); ?></td></tr>
                        <tr><td><code>SITE_CHAT_ADMIN_SECRET</code></td><td><?php echo esc_html__('Yes', 'site-context-chat'); ?></td></tr>
                        <tr><td><code>RESEND_API_KEY</code></td><td><?php echo esc_html__('No (email)', 'site-context-chat'); ?></td></tr>
                        <tr><td><code>SITE_CHAT_NOTIFY_EMAIL</code></td><td><?php echo esc_html__('No', 'site-context-chat'); ?></td></tr>
                    </tbody>
                </table>

                <h4><?php echo esc_html__('Step 2.4 — Deploy edge functions (CLI)', 'site-context-chat'); ?></h4>
                <p>
                    <?php
                    echo wp_kses_post(
                        sprintf(
                            /* translators: %s: Supabase CLI documentation URL */
                            __('Install CLI: <a href="%s" target="_blank" rel="noopener noreferrer">Supabase CLI docs</a>. macOS: <code>brew install supabase/tap/supabase</code>', 'site-context-chat'),
                            esc_url('https://supabase.com/docs/guides/cli/getting-started')
                        )
                    );
                    ?>
                </p>
                <pre class="scc-code">cd path/to/site-context-chat

supabase login
supabase link --project-ref YOUR_PROJECT_REF

supabase db push
supabase functions deploy site-chat
supabase functions deploy site-chat-admin</pre>
            </div>
        </details>

        <details>
            <summary>
                <?php echo esc_html__('Part 3 — Connect WordPress', 'site-context-chat'); ?>
                <span class="scc-setup-guide__meta"><?php echo esc_html__('~5 min', 'site-context-chat'); ?></span>
            </summary>
            <div class="scc-setup-guide__body">
                <ol>
                    <li><?php echo esc_html__('Paste Supabase URL and anon key in the form above → Enable widget → Save.', 'site-context-chat'); ?></li>
                    <li><?php echo esc_html__('Visit your public site — chat button should appear. Send a test message.', 'site-context-chat'); ?></li>
                    <li>
                        <?php
                        echo wp_kses_post(
                            sprintf(
                                /* translators: %s: admin page URL */
                                __('<a href="%s" target="_blank" rel="noopener noreferrer">Open chat admin</a> → enter SITE_CHAT_ADMIN_SECRET → unlock.', 'site-context-chat'),
                                esc_url($admin_url)
                            )
                        );
                        ?>
                    </li>
                </ol>
            </div>
        </details>

        <details>
            <summary>
                <?php echo esc_html__('Part 4 — Train your chatbot', 'site-context-chat'); ?>
                <span class="scc-setup-guide__meta"><?php echo esc_html__('~15 min', 'site-context-chat'); ?></span>
            </summary>
            <div class="scc-setup-guide__body">
                <ol>
                    <li><?php echo esc_html__('Chat admin → Context → paste site markdown (services, FAQs) → Save.', 'site-context-chat'); ?></li>
                    <li><?php echo esc_html__('Appearance tab for colours and welcome message (or Custom CSS above).', 'site-context-chat'); ?></li>
                    <li><?php echo esc_html__('Test tab — send a message before go-live.', 'site-context-chat'); ?></li>
                </ol>
            </div>
        </details>

        <details>
            <summary><?php echo esc_html__('Troubleshooting', 'site-context-chat'); ?></summary>
            <div class="scc-setup-guide__body">
                <table class="widefat striped">
                    <thead>
                        <tr>
                            <th><?php echo esc_html__('Symptom', 'site-context-chat'); ?></th>
                            <th><?php echo esc_html__('Fix', 'site-context-chat'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><?php echo esc_html__('No chat button', 'site-context-chat'); ?></td>
                            <td><?php echo esc_html__('Enable widget + save URL/key (Part 3)', 'site-context-chat'); ?></td>
                        </tr>
                        <tr>
                            <td><?php echo esc_html__('Button but no reply', 'site-context-chat'); ?></td>
                            <td><?php echo esc_html__('Deploy functions + ANTHROPIC_API_KEY (Part 2)', 'site-context-chat'); ?></td>
                        </tr>
                        <tr>
                            <td><?php echo esc_html__('Admin won’t unlock', 'site-context-chat'); ?></td>
                            <td><?php echo esc_html__('Match SITE_CHAT_ADMIN_SECRET in Supabase secrets', 'site-context-chat'); ?></td>
                        </tr>
                        <tr>
                            <td><?php echo esc_html__('Admin stuck loading', 'site-context-chat'); ?></td>
                            <td><?php echo esc_html__('Reinstall latest zip; hard refresh (Cmd+Shift+R)', 'site-context-chat'); ?></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </details>

        <h3 style="margin-top: 1.25rem;"><?php echo esc_html__('Checklist', 'site-context-chat'); ?></h3>
        <ul class="scc-checklist">
            <li><?php echo esc_html__('Plugin activated + admin page with shortcode', 'site-context-chat'); ?></li>
            <li><?php echo esc_html__('Supabase project + SQL migrations', 'site-context-chat'); ?></li>
            <li><?php echo esc_html__('Secrets: ANTHROPIC_API_KEY, SITE_CHAT_ADMIN_SECRET', 'site-context-chat'); ?></li>
            <li><?php echo esc_html__('Functions deployed: site-chat, site-chat-admin', 'site-context-chat'); ?></li>
            <li><?php echo esc_html__('WordPress URL + anon key saved above', 'site-context-chat'); ?></li>
            <li><?php echo esc_html__('Context markdown saved in chat admin', 'site-context-chat'); ?></li>
        </ul>
    </div>
    <?php
}
