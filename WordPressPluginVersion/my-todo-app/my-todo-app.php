<?php
/*
Plugin Name: My Todo & Worktime App (Complete)
Description: The full version of your Todo/Worktime/Diary app synced to WordPress.
Version: 2.3
Author: Generated
*/

if ( ! defined( 'ABSPATH' ) ) exit;

// 1. REST API for Syncing
add_action( 'rest_api_init', function () {
    register_rest_route( 'todo-app/v1', '/sync', array(
        'methods' => 'GET',
        'callback' => 'mta_get_data',
        'permission_callback' => function() { return is_user_logged_in(); }
    ));

    register_rest_route( 'todo-app/v1', '/sync', array(
        'methods' => 'POST',
        'callback' => 'mta_save_data',
        'permission_callback' => function() { return is_user_logged_in(); }
    ));
});

function mta_get_data( $request ) {
    $user_id = get_current_user_id();
    $data = get_user_meta( $user_id, 'mta_app_data', true );
    if ( empty( $data ) ) {
        return new WP_REST_Response( array( 'todos' => [], 'worktimes' => [], 'diaryEntries' => [] ), 200 );
    }
    return new WP_REST_Response( $data, 200 );
}

function mta_save_data( $request ) {
    $user_id = get_current_user_id();
    $params = $request->get_json_params();
    update_user_meta( $user_id, 'mta_app_data', $params );
    return new WP_REST_Response( array( 'status' => 'success' ), 200 );
}

// 2. Page Template
add_filter( 'theme_page_templates', function( $templates ) {
    $templates['app-template.php'] = 'Todo App Canvas';
    return $templates;
});

add_filter( 'template_include', function( $template ) {
    if ( is_page() ) {
        $meta = get_post_meta( get_the_ID(), '_wp_page_template', true );
        if ( 'app-template.php' == $meta ) {
            return plugin_dir_path( __FILE__ ) . 'templates/app-template.php';
        }
    }
    return $template;
});

// 3. Asset Loading
add_action( 'wp_enqueue_scripts', function() {
    if ( is_page() && get_page_template_slug() == 'app-template.php' ) {
        
        wp_enqueue_style( 'mta-style', plugins_url( 'assets/style.css', __FILE__ ), array(), filemtime( plugin_dir_path( __FILE__ ) . 'assets/style.css' ) );

        $deps = array('jquery'); 
        
        // 1. Generic (Global) - We localize data here so it exists before Todo/Worktime load
        wp_enqueue_script( 'mta-generic', plugins_url( 'assets/generic.js', __FILE__ ), $deps, filemtime( plugin_dir_path( __FILE__ ) . 'assets/generic.js' ), true );
        
        wp_localize_script( 'mta-generic', 'wpAppData', array(
            'root' => esc_url_raw( rest_url() ),
            'nonce' => wp_create_nonce( 'wp_rest' ),
            'is_logged_in' => is_user_logged_in(),
            'login_url' => wp_login_url( get_permalink() )
        ));

        // 2. Helpers
        wp_enqueue_script( 'mta-sorting', plugins_url( 'assets/todoSorting.js', __FILE__ ), array('mta-generic'), filemtime( plugin_dir_path( __FILE__ ) . 'assets/todoSorting.js' ), true );
        wp_enqueue_script( 'mta-export', plugins_url( 'assets/exportWorktimeToSystem.js', __FILE__ ), array('mta-generic'), filemtime( plugin_dir_path( __FILE__ ) . 'assets/exportWorktimeToSystem.js' ), true );
        
        // 3. Modules
        wp_enqueue_script( 'mta-todo', plugins_url( 'assets/todo.js', __FILE__ ), array('mta-generic', 'mta-sorting'), filemtime( plugin_dir_path( __FILE__ ) . 'assets/todo.js' ), true );
        wp_enqueue_script( 'mta-worktime', plugins_url( 'assets/worktime.js', __FILE__ ), array('mta-generic', 'mta-export'), filemtime( plugin_dir_path( __FILE__ ) . 'assets/worktime.js' ), true );
        wp_enqueue_script( 'mta-diary', plugins_url( 'assets/diary.js', __FILE__ ), array('mta-generic'), filemtime( plugin_dir_path( __FILE__ ) . 'assets/diary.js' ), true );

        // 4. Sync Logic
        wp_enqueue_script( 'mta-sync', plugins_url( 'assets/sync.js', __FILE__ ), array('mta-todo', 'mta-worktime', 'mta-diary'), filemtime( plugin_dir_path( __FILE__ ) . 'assets/sync.js' ), true );
    }
});

// 4. Admin: Setup / Instructions (theme compatibility)
add_action( 'admin_menu', function() {
    add_options_page(
        'My Todo App – Setup',
        'My Todo App',
        'manage_options',
        'mta-setup',
        'mta_render_setup_page'
    );
});

add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), function( $links ) {
    $url = admin_url( 'options-general.php?page=mta-setup' );
    array_unshift( $links, '<a href="' . esc_url( $url ) . '">Instructions</a>' );
    return $links;
});

function mta_render_setup_page() {
    if ( ! current_user_can( 'manage_options' ) ) return;

    $is_block_theme = function_exists( 'wp_is_block_theme' ) ? wp_is_block_theme() : false;
    $themes_url = admin_url( 'themes.php' );
    $plugins_url = admin_url( 'plugins.php' );
    $pages_url = admin_url( 'edit.php?post_type=page' );
    $permalinks_url = admin_url( 'options-permalink.php' );

    echo '<div class="wrap">';
    echo '<h1>My Todo App – Setup Instructions</h1>';

    if ( $is_block_theme ) {
        echo '<div class="notice notice-warning"><p><strong>Theme compatibility warning:</strong> Your current theme appears to be a block / Full Site Editing (FSE) theme. This plugin relies on a classic PHP page template, which many FSE themes do not support—so the app page may not render even if the plugin is activated.</p></div>';
    }

    echo '<h2>Important: theme compatibility</h2>';
    echo '<p>This plugin uses a custom PHP page template to render the app as a full-screen page.</p>';
    echo '<p>Because of this, it does not work correctly with newer block / Full Site Editing (FSE) themes.<br>';
    echo 'Many modern themes (for example Twenty Twenty-Three and newer) do not support plugin-provided PHP page templates, so the app will not appear even though the plugin is activated.</p>';
    echo '<p>To use this plugin, you must use a classic (non-block) theme that supports page templates.</p>';

    echo '<h2>Recommended themes</h2>';
    echo '<p>The plugin has been tested with classic themes such as:</p>';
    echo '<ul style="list-style: disc; padding-left: 20px;">';
    echo '<li>Twenty Twenty-One</li>';
    echo '<li>Twenty Twenty</li>';
    echo '<li>Twenty Nineteen</li>';
    echo '</ul>';
    echo '<p>Other classic themes should also work, as long as they support page templates.</p>';

    echo '<h2>Setup instructions</h2>';
    echo '<ol>';
    echo '<li><strong>Activate a compatible theme</strong><br>';
    echo 'Go to <a href="' . esc_url( $themes_url ) . '">Appearance → Themes</a><br>';
    echo 'Activate Twenty Twenty-One (or another classic theme)</li>';
    echo '<li><strong>Activate the plugin</strong><br>';
    echo 'Go to <a href="' . esc_url( $plugins_url ) . '">Plugins → Installed Plugins</a><br>';
    echo 'Activate My Todo App</li>';
    echo '<li><strong>Create a page for the app</strong><br>';
    echo 'Go to <a href="' . esc_url( $pages_url ) . '">Pages → Add New</a><br>';
    echo 'Give the page a title (for example: Todo App)<br>';
    echo 'In the page editor sidebar, find Template (or Page Attributes → Template)<br>';
    echo 'Select <strong>Todo App Canvas</strong><br>';
    echo 'Publish the page</li>';
    echo '<li><strong>View the app</strong><br>';
    echo 'Click View Page<br>';
    echo 'The app should now load as a full-page interface</li>';
    echo '</ol>';

    echo '<h2>Notes and limitations</h2>';
    echo '<ul style="list-style: disc; padding-left: 20px;">';
    echo '<li>The app is designed to be the entire page, not embedded inside content.</li>';
    echo '<li>Sync features require you to be logged in to WordPress.</li>';
    echo '<li>Switching back to a block/FSE theme will cause the app page to stop rendering.</li>';
    echo '</ul>';

    echo '<h2>Troubleshooting</h2>';
    echo '<p>If the app does not appear:</p>';
    echo '<ul style="list-style: disc; padding-left: 20px;">';
    echo '<li>Confirm you are using a classic theme</li>';
    echo '<li>Confirm the page template is set to <strong>Todo App Canvas</strong></li>';
    echo '<li>Try refreshing permalinks via <a href="' . esc_url( $permalinks_url ) . '">Settings → Permalinks → Save</a></li>';
    echo '</ul>';

    echo '</div>';
}
