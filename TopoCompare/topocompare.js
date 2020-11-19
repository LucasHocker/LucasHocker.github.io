//Create a module
var tc = angular.module('tc', ['ngRoute', 'ngAnimate']);

//Use a service to store the data
tc.factory('jsonService',['$rootScope', function ($rootScope) {
     var jsondata = {};

     return {
            get: get,
            update: update
        };

        // .................

        function get() {
            console.log('jsondata: ' + jsondata);
            return jsondata;
        }

     function update(jd){
        jsondata=jd;
        $rootScope.$broadcast('jsondata:Loaded',jsondata);
     }

}]);

//Create a controller for the url & token inputs
tc.controller('connectCtrl', ['$rootScope','$scope','$http','jsonService','$filter',connectCtrl]);

function connectCtrl($rootScope, $scope, $http, jsonService, $filter){
    //Initialization stuff
   $scope.url='https://<mytenant>.live.dynatrace.com/api/v1/'; //Default
   $scope.token='Your_Token_Here';
   $scope.sslayers=[
        {name:'Application',    endpoint:'entity/applications'},
        {name:'Service',        endpoint:'entity/services'},
        {name:'ProcessGroup',   endpoint:'entity/infrastructure/process-groups'},
        {name:'Host',           endpoint:'entity/infrastructure/hosts'}
   ];
   $scope.compares=[
       {name:'MgmtZone'},
       {name:'Tag'},
       {name:'Time'}

   ];
   $scope.sslayer=$scope.sslayers[3];
   $rootScope.compareby=$scope.compares[0];
   $scope.panes=[
    {class:'all',   filter:''},
    {class:'left',  filter:'isLeftTagged'},
    {class:'both',  filter:'isLeftTagged | filter:isRightTagged'},
    {class:'right', filter:'isRightTagged'}
   ];
   $scope.times=[
    {label:'Last 30 minutes',   val:-1800000, grp:'L'},
    {label:'Last 1 hour',       val:-3600000, grp:'L'},
    {label:'Last 2 hours',      val:-7200000, grp:'L'},
    {label:'Last 6 hours',      val:-10800000, grp:'L'},
    {label:'Last 24 hours',     val:-86400000, grp:'L'},
    {label:'Now',               val:-300000, grp:'L'},
    {label:'Last 72 hours',     val:-259200000, grp:'R'},
    {label:'Last 7 days',       val:-604800000, grp:'R'},
    {label:'Last 30 days',      val:-2.592e+9, grp:'R'},
    {label:'Last 90 days',      val:-7.776e+9, grp:'R'},
    {label:'Last 365 days',     val:-3.154e+10, grp:'R'},
    {label:'Yesterday',         val:-86400000, grp:'R'}
   ];
   var s = (new Date).getTime();
   angular.forEach($scope.times, function(value, key){
     
     value.val += s;
     //console.log(value.label + ': ' + value.val + '\t' + $filter('date')(value.val,'yyyy-MM-dd HH:mm:ss Z'));
    });
   $rootScope.leftTime=$scope.times[5];
   $rootScope.rightTime=$scope.times[11];
   $scope.deps=[
   {name:'Overlaps'},
   {name:'Dependencies'}
   ];
   $rootScope.depends=$scope.deps[0];
   $rootScope.entLookup=[];


   $scope.callApi = function() {
        var request = $scope.url + $scope.sslayer.endpoint + '?Api-Token=' + $scope.token ;
      $http.get(request).
       then(function successCallback(response) {
            console.log(request);
            //jsonService.update(response.data);
            //$scope.jsondata = jsonService.get();
            $rootScope.jsondata = response.data;

            //Calculate a list of tags
            $rootScope.tags = [];
            var tagkey = "";
            angular.forEach($rootScope.jsondata, function(val1, key1){
                angular.forEach(val1.tags, function(val2, key2){
                    tagkey = val2.key;
                    if($rootScope.tags[tagkey] !== undefined){
                        $rootScope.tags[tagkey].count++;     
                    } else {
                        $rootScope.tags[tagkey]={'tag':tagkey,'count':1};

                    }
                })

                //Also populate a lookup table
                $rootScope.entLookup[val1.entityId]=val1.displayName;
            });
            $rootScope.arrFromTags = Object.keys($rootScope.tags).map(function(key) {
                return $rootScope.tags[key];
            });
            $rootScope.arrFromTags.sort();

            //Calculate a list of MZs
            $rootScope.MZs = [];
            var mzname = "";
            angular.forEach($rootScope.jsondata, function(val1, key1){
                angular.forEach(val1.managementZones, function(val2, key2){
                    mzname = val2.name;
                    if($rootScope.MZs[mzname] !== undefined){
                        $rootScope.MZs[mzname].count++;     
                    } else {
                        $rootScope.MZs[mzname]={'name':mzname,'count':1};

                    }
                })

            });
            $rootScope.arrFromMZs = Object.keys($rootScope.MZs).map(function(key) {
                return $rootScope.MZs[key];
            });
            $rootScope.arrFromMZs.sort();

            $scope.loaded=true;
            //console.log(response);
        }, function errorCallback(response) {
        // called asynchronously if an error occurs
        // or server returns response with an error status.
            console.log(request);
            console.log(response.data);
       });
   };

   $rootScope.isLeftTagged = function(entity) {
        var tagged=0;
        angular.forEach(entity.tags, function(tag)
        {
            if(tag.key.includes($rootScope.leftTag)){
            tagged=1;}
        });

        return tagged;
   };

   $rootScope.isRightTagged = function(entity) {
        var tagged=0;
        angular.forEach(entity.tags, function(tag)
        {
            if(tag.key.includes($rootScope.rightTag)){
            tagged=1;}
        });

        return tagged;
   };

   $rootScope.leftFilter = function(entity) {
        switch($rootScope.compareby.name){
        case 'Tag':
            var tagged=0;
            angular.forEach(entity.tags, function(tag)
            {
                if(tag.key.includes($rootScope.leftTag)){
                tagged=1;}
            });

            return tagged;
        case 'Time':
            //console.log('leftTime.val:\t'+$rootScope.leftTime.val+
            //    '\nfirstSeenTimestamp:\t'+entity.firstSeenTimestamp+
            //    '\nlastSeenTimestamp:\t'+entity.lastSeenTimestamp+
            //    '\n');
            if($rootScope.leftTime.val >= entity.firstSeenTimestamp &&
               $rootScope.leftTime.val <= entity.lastSeenTimestamp)
            { return true;}
        case 'MgmtZone':
            var inMZ=0;
            angular.forEach(entity.managementZones, function(mz)
            {
                if(mz.name.includes($rootScope.leftMZ)){
                inMZ=1;}
            });

            return inMZ;
        default:
            return false;
        }
   };

   $rootScope.rightFilter = function(entity) {
        switch($rootScope.compareby.name){
        case 'Tag':
            var tagged=0;
            angular.forEach(entity.tags, function(tag)
            {
                if(tag.key.includes($rootScope.rightTag)){
                tagged=1;}
            });

            return tagged;
        case 'Time':
            if($rootScope.rightTime.val >= entity.firstSeenTimestamp &&
               $rootScope.rightTime.val <= entity.lastSeenTimestamp)
            { return true;}
        case 'MgmtZone':
            var inMZ=0;
            angular.forEach(entity.managementZones, function(mz)
            {
                if(mz.name.includes($rootScope.rightMZ)){
                inMZ=1;}
            });

            return inMZ;
        default:
            return false;
        }
   };


   $scope.addSpaces = function(host) {
        return host.replace(',', ', ');
   };

   $rootScope.updateLeftTag = function(tag){
        $rootScope.leftTag=tag;
        return;
   };

   $rootScope.updateRightTag = function(tag){
        $rootScope.rightTag=tag;
        return;
   }

   $rootScope.updateLeftMZ = function(mz){
        $rootScope.leftMZ=mz;
        return;
   };

   $rootScope.updateRightMZ = function(mz){
        $rootScope.rightMZ=mz;
        return;
   }

};

tc.filter('filterProperties', function() {
   return function(props){
        var result = {};
        var filterList = [
            'tags',
            'toRelationships',
            'fromRelationships',
            'firstSeenTimestamp',
            'lastSeenTimestamp',
            'entityId',
            'osVersion',
            'ipAddresses',
            'displayName',
            'softwareTechnologies',
            'managementZones'
        ];
        angular.forEach(props, function(value, key) {
            if (!filterList.includes(key)) {
                result[key]=value;
                //console.log('key: '+key+' value: '+value); 
            }
        });

        return result;
    };
});

tc.filter('filterDependencies', ['$rootScope','$filter', function($rootScope,$filter) {
   return function(entities){
        var result = [];
        var rightEntIds = {};

      //create a lookup table based on right filter
      var rightList=$filter('filter')($rootScope.jsondata,$rootScope.rightFilter);
      angular.forEach(rightList, function(value,key){
        rightEntIds[value.entityId]=value.displayName;
      });
      //console.log('right:',rightEntIds);

      angular.forEach(entities, function(entity){
        
        switch($rootScope.compareby.name){
        case 'Tag':
            //only entities that are left tagged
            var tagged=0;
            angular.forEach(entity.tags, function(tag)
            {
                if(tag.key.includes($rootScope.leftTag)){
                tagged=1;}
            });
            if(!tagged){return false;};

            angular.forEach(entity.toRelationships.isNetworkClientOfHost, function(value, key) {
                if(rightEntIds.hasOwnProperty(value)){
                    //console.log('value:'+value+'\tdisplayName:'+rightEntIds[value]);
                    result.push(entity.displayName+' -> '+rightEntIds[value]);
                } else { 
                    //console.log('not:',value);
                }

            });
            //var deps=$filter('filter')(entity.toRelationships,)
        case 'Time':
            if($rootScope.leftTime.val >= entity.firstSeenTimestamp &&
               $rootScope.leftTime.val <= entity.lastSeenTimestamp)
            { return true;}
        default:
            return false;
        }


        return result;
      });
    };
}]);


tc.directive('mypane', ['$rootScope','jsonService', function(jsonService){
   return {
    scope: {
        panename: '@'
    },
    transclude: true,
    controller: ['$scope', 'jsonService', function($scope, jsonService){
        
            //console.log('data: '+jsondata);
    }],
    templateUrl: function(elem, attr){
        return attr.paneurl
    }
   };
}]);

//tc.config(function($logProvider){
//    $logProvider.debugEnabled(true);
//});
