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
        
        wp_enqueue_style( 'mta-style', plugins_url( 'assets/style.css', __FILE__ ), array(), '2.3' );

        $deps = array('jquery'); 
        
        // 1. Generic (Global) - We localize data here so it exists before Todo/Worktime load
        wp_enqueue_script( 'mta-generic', plugins_url( 'assets/generic.js', __FILE__ ), $deps, '2.3', true );
        
        wp_localize_script( 'mta-generic', 'wpAppData', array(
            'root' => esc_url_raw( rest_url() ),
            'nonce' => wp_create_nonce( 'wp_rest' ),
            'is_logged_in' => is_user_logged_in(),
            'login_url' => wp_login_url( get_permalink() )
        ));

        // 2. Helpers
        wp_enqueue_script( 'mta-sorting', plugins_url( 'assets/todoSorting.js', __FILE__ ), array('mta-generic'), '2.3', true );
        wp_enqueue_script( 'mta-export', plugins_url( 'assets/exportWorktimeToSystem.js', __FILE__ ), array('mta-generic'), '2.3', true );
        
        // 3. Modules
        wp_enqueue_script( 'mta-todo', plugins_url( 'assets/todo.js', __FILE__ ), array('mta-generic', 'mta-sorting'), '2.3', true );
        wp_enqueue_script( 'mta-worktime', plugins_url( 'assets/worktime.js', __FILE__ ), array('mta-generic', 'mta-export'), '2.3', true );
        wp_enqueue_script( 'mta-diary', plugins_url( 'assets/diary.js', __FILE__ ), array('mta-generic'), '2.3', true );

        // 4. Sync Logic
        wp_enqueue_script( 'mta-sync', plugins_url( 'assets/sync.js', __FILE__ ), array('mta-todo', 'mta-worktime', 'mta-diary'), '2.3', true );
    }
});
