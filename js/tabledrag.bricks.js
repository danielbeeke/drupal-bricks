(function ($, Drupal) {
    Drupal.behaviors.tabledragBricks = {
        attach: function (context, settings) {

            if (Drupal.tableDrag && drupalSettings.bricks && drupalSettings.bricks.nesting) {
              Object.keys(settings.tableDrag).forEach((tableId, tableSettings) => {
                let table = document.querySelector('#' + tableId);
                table.addEventListener('editSettings', (event) => {
                    event.detail.validators = [
                      [TableDrag.validators.types, {
                        attributeName: 'bundle',
                        nestable: drupalSettings.bricks.nesting
                      }],
                      TableDrag.validators.tree
                    ];
                });
              });
            }

        }
    };
})(jQuery, Drupal);
