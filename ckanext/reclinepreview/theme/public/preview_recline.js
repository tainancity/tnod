// recline preview module
this.ckan.module('reclinepreview', function (jQuery, _) {
  return {
    options: {
      i18n: {
        errorLoadingPreview: "Could not load preview",
        errorDataProxy: "DataProxy returned an error",
        errorDataStore: "DataStore returned an error",
        previewNotAvailableForDataType: "Preview not available for data type: "
      },
      site_url: ""
    },

    initialize: function () {
      jQuery.proxyAll(this, /_on/);
      this.el.ready(this._onReady);
      // hack to make leaflet use a particular location to look for images
      L.Icon.Default.imagePath = this.options.site_url + 'vendor/leaflet/0.4.4/images';
    },

    _onReady: function() {
      this.loadPreviewDialog(preload_resource);
	
	//#JOE#//
	var lats = jQuery('.editor-lat-field select option').filter(function (i,d){ 
		return d.value.indexOf('緯度')>-1;
	});
	if(lats.length >0){
		jQuery('.editor-lat-field select').val(lats[0].value);
	}

	var lngs = jQuery('.editor-lon-field select option').filter(function (i,d){ 
		return d.value.indexOf('經度')>-1;
	});
	if(lngs.length >0){
		jQuery('.editor-lon-field select').val(lngs[0].value);
	}
	jQuery('.editor-update-map').click();

    },

    // **Public: Loads a data preview**
    //
    // Fetches the preview data object from the link provided and loads the
    // parsed data from the webstore displaying it in the most appropriate
    // manner.
    //
    // link - Preview button.
    //
    // Returns nothing.
    loadPreviewDialog: function (resourceData) {
      var self = this;

      function showError(msg){
        msg = msg || _('error loading preview');
        window.parent.ckan.pubsub.publish('data-viewer-error', msg);
      }

      recline.Backend.DataProxy.timeout = 10000;
      // will no be necessary any more with https://github.com/okfn/recline/pull/345
      recline.Backend.DataProxy.dataproxy_url = '//jsonpdataproxy.appspot.com';

      // 2 situations
      // a) something was posted to the datastore - need to check for this
      // b) csv or xls (but not datastore)
      resourceData.formatNormalized = this.normalizeFormat(resourceData.format);

      resourceData.url  = this.normalizeUrl(resourceData.url);
      if (resourceData.formatNormalized === '') {
        var tmp = resourceData.url.split('/');
        tmp = tmp[tmp.length - 1];
        tmp = tmp.split('?'); // query strings
        tmp = tmp[0];
        var ext = tmp.split('.');
        if (ext.length > 1) {
          resourceData.formatNormalized = ext[ext.length-1];
        }
      }

      var errorMsg, dataset;

      if (resourceData.datastore_active) {
        resourceData.backend =  'ckan';
        // Set endpoint of the resource to the datastore api (so it can locate
        // CKAN DataStore)
        resourceData.endpoint = jQuery('body').data('site-root') + 'api';
        dataset = new recline.Model.Dataset(resourceData);
        errorMsg = this.options.i18n.errorLoadingPreview + ': ' + this.options.i18n.errorDataStore;
        dataset.fetch()
          .done(function(dataset){
              self.initializeDataExplorer(dataset);
          })
          .fail(function(error){
            if (error.message) errorMsg += ' (' + error.message + ')';
            showError(errorMsg);
          });

      } else if (resourceData.formatNormalized in {'csv': '', 'xls': ''}) {
        // set format as this is used by Recline in setting format for DataProxy
        resourceData.format = resourceData.formatNormalized;
        resourceData.backend = 'dataproxy';
        dataset = new recline.Model.Dataset(resourceData);
        errorMsg = this.options.i18n.errorLoadingPreview + ': ' +this.options.i18n.errorDataProxy;
        dataset.fetch()
          .done(function(dataset){
            dataset.bind('query:fail', function (error) {
              jQuery('.data-view-container', self.el).hide();
              jQuery('.header', self.el).hide();
            });

            self.initializeDataExplorer(dataset);
          })
          .fail(function(error){
            if (error.message) errorMsg += ' (' + error.message + ')';
            showError(errorMsg);
          });
      }
    },

    initializeDataExplorer: function (dataset) {
      var views = [
        {
          id: 'grid',
          label: '表格',
		  tips: '提醒您：透過資料表格預覽方式了解資料內容，點擊欄位名稱可進行排序',
          view: new recline.View.SlickGrid({
            model: dataset
          })
        },
        {
          id: 'graph',
          label: '圖表',
		  tips: '提醒您：「圖表」功能可指定目標資料欄位快速繪製統計圖表',
          view: new recline.View.Graph({
            model: dataset
          })
        },
        {
          id: 'map',
          label: '地圖',
		  tips: '提醒您：「地圖」功能可依據資料集所提供的經緯度坐標資訊進行地圖顯示',
          view: new recline.View.Map({
            model: dataset
          })
        }
      ];

      var sidebarViews = [
        {
          id: 'valueFilter',
          label: '篩選',
          view: new recline.View.ValueFilter({
            model: dataset
          })
        }
      ];

      var dataExplorer = new recline.View.MultiView({
        el: this.el,
        model: dataset,
        views: views,
        sidebarViews: sidebarViews,
        config: {
          readOnly: true
        }
      });

    },
    normalizeFormat: function (format) {
      var out = format.toLowerCase();
      out = out.split('/');
      out = out[out.length-1];
      return out;
    },
    normalizeUrl: function (url) {
      if (url.indexOf('https') === 0) {
        return 'http' + url.slice(5);
      } else {
        return url;
      }
    }
  };
});
