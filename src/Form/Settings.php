<?php

namespace Drupal\bricks\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\field\Entity\FieldStorageConfig;

/**
 * Provides the search reindex confirmation form.
 */
class Settings extends ConfigFormBase {

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'bricks_settings';
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames() {
    return [
      'bricks.settings',
    ];
  }

  public function buildForm(array $form, FormStateInterface $form_state) {
    $config = $this->config('bricks.settings');
    $nesting_data = $config->get('nesting');

    $form['#tree'] = TRUE;

    $target_entity_types = $this->getTargetEntityTypesByFieldTypes(['bricks', 'bricks_revisioned']);

    $form['nesting'] = [
      '#type' => 'container',
      '#open' => TRUE,
    ];

    foreach ($target_entity_types as $target_entity_type) {
      $target_entity_type_bundles = \Drupal::entityManager()->getBundleInfo($target_entity_type);
      $target_entity_type_info = \Drupal::entityTypeManager()->getDefinition($target_entity_type);

      $form['nesting'][$target_entity_type] = [
        '#title' => $target_entity_type_info->getLabel(),
        '#type' => 'details',
        '#open' => TRUE,
      ];

      $target_options = [];
      foreach ($target_entity_type_bundles as $target_entity_type_bundle => $target_entity_type_bundle_info) {
        $target_options[$target_entity_type_bundle] = $target_entity_type_bundle_info['label'];
      }

      foreach ($target_options as $target_option_key => $target_option) {
        $form['nesting'][$target_entity_type][$target_option_key] = [
          '#title' => $this->t('<em>:bundle</em> may be nested inside:', [':bundle' => $target_option]),
          '#type' => 'checkboxes',
          '#options' => $target_options,
          '#default_value' => $nesting_data[$target_entity_type][$target_option_key]
        ];
      }
    }

    return parent::buildForm($form, $form_state);
  }

  private function getTargetEntityTypesByFieldTypes($field_types) {
    $target_entity_types = [];

    foreach ($field_types as $field_type) {
      $field_map = \Drupal::entityManager()->getFieldMapByFieldType($field_type);


      foreach ($field_map as $entity_type_id => $fields) {
        foreach ($fields as $field_name => $field_bundles_and_type) {
          $field_storage_config = FieldStorageConfig::loadByName($entity_type_id, $field_name);
          $target_entity_types[] = $field_storage_config->getSetting('target_type');
        }
      }
    }

    return $target_entity_types;
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    $nesting_data = $form_state->getValue('nesting');

    $this->config('bricks.settings')
    ->set('nesting', $nesting_data)
    ->save();

    parent::submitForm($form, $form_state);
  }

}
