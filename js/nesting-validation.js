(function ($, Drupal) {
    Drupal.behaviors.bricksNestingValidation = {
        attach: function (context, settings) {

            if (Drupal.tableDrag) {
                var _isValidSwap = Drupal.tableDrag.prototype.row.prototype.isValidSwap;

                Drupal.tableDrag.prototype.row.prototype.isValidSwap = function(tr) {
                    if ($(tr).index() == 0) {
                        this.interval.max = 0;
                        return true;
                    }
                    return  _isValidSwap.apply(this, arguments);
                };

                var _validIndentInterval = Drupal.tableDrag.prototype.row.prototype.validIndentInterval;

                Drupal.tableDrag.prototype.row.prototype.validIndentInterval = function (prevRow, nextRow) {
                    var values = _validIndentInterval.apply(this, arguments);
                    var currentBundle = $(this.element).attr('data-bundle');
                    var prevBundle = $(prevRow).attr('data-bundle');
                    var parentBundle = $(this.group[0]).prev('tr').attr('data-bundle');

                    if ($.inArray(prevBundle, settings.bricks.nesting[currentBundle]) !== -1 || $.inArray(parentBundle, settings.bricks.nesting[currentBundle]) !== -1) {
                        values.max = 1;
                    }
                    else {
                        values.max = 0;
                    }

                    return values;
                };


            }

        }
    };
})(jQuery, Drupal);
