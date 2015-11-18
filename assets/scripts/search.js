(function(google) {
  google.load('search', '1', {
    language: 'en',
    style: google.loader.themes.V2_DEFAULT
  });

  google.setOnLoadCallback(function() {
    var cx = '000850824335660518947:3osiz3zllwq';
    var customSearchOptions = {};
    var customSearchControl =  new google.search.CustomSearchControl(cx, customSearchOptions);
    customSearchControl.setResultSetSize(google.search.Search.FILTERED_CSE_RESULTSET);

    var options = new google.search.DrawOptions();

    options.enableSearchResultsOnly();
    options.setAutoComplete(false);
    customSearchControl.draw('searchResult', options);

    function parseParamsFromUrl() {
      var params = {};
      var parts = window.location.search.substr(1).split('&');

      for (var i = 0; i < parts.length; i++) {
        var keyValuePair = parts[i].split('=');
        var key = decodeURIComponent(keyValuePair[0]);

        params[key] = keyValuePair[1] ?
          decodeURIComponent(keyValuePair[1].replace(/\+/g, ' ')) :
          keyValuePair[1];
      }

      return params;
    }

    var urlParams = parseParamsFromUrl();
    var queryParamName = 'q';

    if (urlParams[queryParamName]) {
      customSearchControl.execute(urlParams[queryParamName]);
    }
  }, true);
})(google);
