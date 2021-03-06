﻿(function () {
    'use strict';
    var app = angular.module("matterMain");
    app.controller('MatterUsersController', ['$scope', '$state', '$stateParams', 'api', 'matterResource', '$filter', '$window', '$rootScope', '$location',
    function ($scope, $state, $stateParams, api, matterResource, $filter, $window, $rootScope, $location) {
        var cm = this;
        cm.arrAssignedUserName = [],
        cm.arrAssignedUserEmails = [],
        cm.userIDs = [];
        cm.matterProperties = undefined;
        cm.assignPermissionTeams = [];
        $rootScope.profileClass = "hide";
        cm.notificationPopUpBlock = false;
        cm.sConflictScenario = "";
        cm.isEdit = "false";
        cm.oMandatoryRoleNames = [];
        cm.popupContainerBackground = "Show";
        $rootScope.bodyclass = "bodymain";
        $rootScope.displayOverflow = "";
        cm.oSiteUsers = [];
        cm.oSiteUserNames = [];
        cm.invalidUserCheck = false;
        cm.configsUri = configs.uri;
        cm.showRoles = true;
        cm.isBackwardCompatible = configs.global.isBackwardCompatible;
        cm.defaultRoleName = cm.isBackwardCompatible ? "Responsible Attorney" : "Attorney";
        var siteCollectionPath = "";
        cm.oEmailRegExpr = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        cm.getExternalUserNotification = true;
        cm.currentExternalUser = {};
        cm.createContent = uiconfigs.CreateMatter;
        function getParameterByName(name) {
            "use strict";
            name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
            var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
                results = regex.exec(decodeURIComponent($location.absUrl()));
            return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        }

        cm.clientUrl = getParameterByName("clientUrl");
        cm.matterName = getParameterByName("matterName");
        cm.isEdit = getParameterByName("IsEdit");

        if (cm.clientUrl === "" && cm.matterName === "") {
            cm.matterName = "";
        }
        //#region Service API Call
        //API call to get roles that are configured in the system
        function getRoles(options, callback) {
            api({
                resource: 'matterResource',
                method: 'getRoles',
                data: options,
                success: callback
            });
        }
        //API call to get permission levels that are configured in the system
        function getPermissionLevels(options, callback) {
            api({
                resource: 'matterResource',
                method: 'getPermissionLevels',
                data: options,
                success: callback
            });
        }

        //API call to users from matter stamped properties api
        function getStampedProperties(options, callback) {
            api({
                resource: 'matterResource',
                method: 'getStampedProperties',
                data: options,
                success: callback
            });
        }
        //API call to update matter permissions
        function updateMatterPermissions(optionsForUsers, callback) {
            api({
                resource: 'matterResource',
                method: 'updateMatter',
                data: optionsForUsers,
                success: callback
            });
        }
        //API call to check whether a user exists or not?
        function userexists(options, callback) {
            api({
                resource: 'matterResource',
                method: 'userexists',
                data: options,
                success: callback
            });
        }
        //API call to get default configurations of client?
        function getDefaultMatterConfigurations(siteCollectionPath, callback) {
            api({
                resource: 'matterResource',
                method: 'getDefaultMatterConfigurations',
                data: JSON.stringify(siteCollectionPath),
                success: callback
            });
        }

        function getUsers(optinos, callback) {
            api({
                resource: 'matterResource',
                method: 'getUsers',
                data: optinos,
                success: callback
            });
        }
        //#endregion

        //#region
        cm.searchUsers = function (val) {
            $("[uib-typeahead-popup].dropdown-menu").css("display", "block");
            cm.typehead = true;
            if (val && val != null && val != "") {
                if (val.indexOf(';') > -1) {
                    var res = val.split(";");
                    if (res[res.length - 1] != "") {
                        val = res[res.length - 1];
                    }
                }
            }

            var searchUserRequest = {
                Client: {
                    //Need to get the matter url from query string
                    Url: cm.clientUrl
                },
                SearchObject: {
                    SearchTerm: val
                }
            };
            return matterResource.getUsers(searchUserRequest).$promise;
        }

        var optionsForRoles = new Object;
        optionsForRoles = {
            Url: configs.global.repositoryUrl
        }

        var optionsForPermissionLevels = new Object;
        optionsForPermissionLevels = {
            Url: configs.global.repositoryUrl
        }

        var optionsForStampedProperties = new Object;
        optionsForStampedProperties = {
            Client: {
                Url: cm.clientUrl
            },
            Matter: {
                // Name:'Microsoft Matter'
                Name: cm.matterName
            }
        }
        //endregion
        siteCollectionPath = cm.clientUrl;
        getDefaultMatterConfigurations(siteCollectionPath, function (result) {
            if (result.isError) {

            }
            else {
                var defaultMatterConfig = JSON.parse(result.code);
                cm.showRoles = defaultMatterConfig.ShowRole != undefined ? defaultMatterConfig.ShowRole : (cm.isBackwardCompatible ? false : true);
            }
        });

        //#region Main function calss
        function getMatterUsers() {
            if (cm.clientUrl !== "" && cm.matterName !== "") {
                getStampedProperties(optionsForStampedProperties, function (response) {
                    cm.matterProperties = response
                    console.log(response);
                    //Get all roles from catalog site collection
                    getRoles(optionsForRoles, function (response) {
                        cm.assignRoles = response;
                        //Get all permissions from catalog site collection
                        getPermissionLevels(optionsForPermissionLevels, function (response) {
                            cm.assignPermissions = response;
                            getUsersRolesAndPermissions();
                            cm.popupContainerBackground = "hide";
                        });
                    });
                });
            }
        }

        getMatterUsers();
        cm.CheckPopUp = function (e) {
            if (!cm.errorStatus) {
                cm.errorPopUpBlock = false;
                cm.errorBorder = "";
            }
            cm.errorStatus = false;

        }

        function getUsersRolesAndPermissions() {
            var tempMatterProp = cm.matterProperties;
            var userEmails = tempMatterProp.matterObject.assignUserEmails;
            var userNames = tempMatterProp.matterObject.assignUserNames;
            var permissions = tempMatterProp.matterObject.permissions;
            var roles = tempMatterProp.matterObject.roles;
            cm.sConflictScenario = 0 < tempMatterProp.matterObject.blockUserNames.length ? "True" : "False";

            if (userEmails && userNames && roles && permissions && userEmails.length === userNames.length && userNames.length === permissions.length && roles.length === permissions.length) {
                setMatterUsersData(true);
            }
            else if (userNames && permissions && userNames.length === permissions.length) {
                for (var i = 0; i < userNames.length; i++) {
                    var val = userNames[i][0];
                    var searchUserRequest = {
                        Client: {
                            Url: cm.clientUrl
                        },
                        SearchObject: {
                            SearchTerm: val
                        }
                    };
                    getUsers(searchUserRequest, function (resp) {
                        var userObj = resp[0];
                        if (cm.usersData == undefined) {
                            cm.usersData = [];
                        }
                        var userInfo = { userName: "", userEmail: "" };
                        userInfo.userName = userObj.name;
                        userInfo.userEmail = userObj.email;
                        if (-1 == cm.usersData.indexOf(userInfo.userName)) {
                            cm.usersData.push(userInfo);
                        }
                        if (cm.usersData.length == userNames.length) {
                            setMatterUsersData(false);
                        }
                    });
                }

            }

        }

        function setMatterUsersData(isUserEmailsPresent) {
            var tempMatterProp = cm.matterProperties;
            var userEmails = tempMatterProp.matterObject.assignUserEmails;
            var userNames = tempMatterProp.matterObject.assignUserNames;
            var permissions = tempMatterProp.matterObject.permissions;
            var roles = tempMatterProp.matterObject.roles;
            var rolesPresent = roles ? ((roles.length === permissions.length) ? true : false) : false;
            for (var i = 0; i < userNames.length; i++) {
                var assignedTeam = {};
                var userEmailValue = "", userNameValue = "";
                if (isUserEmailsPresent) {
                    userNameValue = userNames[i][0];
                    userEmailValue = userEmails[i][0];
                } else {
                    var result = $filter('filter')(cm.usersData, { userName: userNames[i][0] });
                    userNameValue = result[0].userName;
                    userEmailValue = result[0].userEmail;
                }

                assignedTeam.assignedUser = userNameValue + "(" + userEmailValue + ");";
                assignedTeam.userExsists = true; assignedTeam.userConfirmation = true;
                if (-1 == cm.oSiteUsers.indexOf(userEmailValue)) {
                    cm.oSiteUsers.push(userEmailValue);
                }
                if (-1 == cm.oSiteUserNames.indexOf(userNameValue)) {
                    cm.oSiteUserNames.push(userNameValue);
                }
                angular.forEach(cm.assignRoles, function (role) {
                    if (rolesPresent) {
                        if (role.name == roles[i]) {
                            assignedTeam.assignedRole = role;
                        }
                    } else {
                        if (role.name == cm.defaultRoleName) {
                            assignedTeam.assignedRole = role;
                        }
                    }
                });
                angular.forEach(cm.assignPermissions, function (permission) {
                    if (permission.name == permissions[i]) {
                        assignedTeam.assignedPermission = permission;
                    }
                });
                cm.assignPermissionTeams = (cm.assignPermissionTeams.length == 1 && cm.assignPermissionTeams[0].assignedUser == "") ? [] : cm.assignPermissionTeams;
                assignedTeam.assigneTeamRowNumber = (cm.assignPermissionTeams.length == 1 && cm.assignPermissionTeams[0].assignedUser == "") ? 1 : cm.assignPermissionTeams.length + 1;
                assignedTeam.assignedAllUserNamesAndEmails = assignedTeam.assignedUser;
                assignedTeam.teamUsers = [];
                var teamuser = {};
                teamuser.userName = assignedTeam.assignedUser;
                teamuser.userExsists = true;
                teamuser.userConfirmation = true;
                assignedTeam.teamUsers.push(teamuser);
                assignedTeam.userConfirmation = true;
                cm.assignPermissionTeams.push(assignedTeam);
            }
        }

        cm.removeAssignPermissionsRow = function (index) {
            var remainingRows = cm.assignPermissionTeams.length;
            if (1 < remainingRows) {
                cm.assignPermissionTeams.splice(index, 1);

            }
            cm.notificationPopUpBlock = false;
            cm.notificationBorder = "";
        };
        cm.addNewAssignPermissions = function () {
            var newItemNo = cm.assignPermissionTeams.length + 1;
            cm.assignPermissionTeams.push({ 'assigneTeamRowNumber': newItemNo, 'assignedAllUserNamesAndEmails': '', 'assignedRole': cm.assignRoles[0], 'assignedPermission': cm.assignPermissions[0], 'userConfirmation': false, 'teamUsers': [] });
        };

        //#endregion
        function validateEmail(email) {
            var re = new RegExp(cm.oEmailRegExpr);
            return re.test(email);
        }

        cm.checkUserExists = function (teamDetails, $event) {
            var userMailId = teamDetails.assignedUser;
            if ($event) {
                $event.stopPropagation();
            }

            function validate(email) {
                if (validateEmail(email)) {
                    var checkEmailExists = false;
                    if (cm.textInputUser && cm.textInputUser != "") {
                        var oldUserEmail = angular.element('#txtUser' + teamDetails.assigneTeamRowNumber).attr('uservalue');
                        if (oldUserEmail.indexOf(email) == -1) {
                            checkEmailExists = true;
                            teamDetails.userConfirmation = false;
                        }
                        else {
                            teamDetails.userConfirmation = teamDetails.userConfirmation;
                            teamDetails.userExsists = false;
                            cm.invalidUserCheck = true;
                        }

                    } else {
                        checkEmailExists = true;
                    }
                    if (checkEmailExists) {
                        var optionsForUserExsists = new Object;
                        optionsForUserExsists = {
                            Url: cm.clientUrl,
                            Name: email
                        }
                        cm.popupContainerBackground = "show";
                        userexists(optionsForUserExsists, function (response) {
                            if (!response.isUserExistsInSite) {
                                angular.forEach(cm.assignPermissionTeams, function (team) {
                                    var userEmail = getUserName(team.assignedUser, false);
                                    for (var i = 0; i < userEmail.length; i++) {
                                        if (userEmail[i] == email && team.assigneTeamRowNumber == teamDetails.assigneTeamRowNumber) {

                                            team.userExsists = response.isUserExistsInSite;
                                            team.userConfirmation = false;
                                            var userDetails = {};
                                            userDetails.userName = userEmail[i];
                                            userDetails.userExsists = team.userExsists;
                                            userDetails.userConfirmation = false;
                                            if (!team.teamUsers) {
                                                team.teamUsers = [];
                                            }
                                            var isRowPresent = $filter("filter")(team.teamUsers, userEmail[i]);
                                            if (isRowPresent.length == 0) {
                                                team.teamUsers.push(userDetails);
                                            }
                                            if (cm.getExternalUserNotification) {
                                                cm.textInputUser = team;
                                                cm.currentExternalUser.userName = userEmail[i];
                                                cm.currentExternalUser.rowNumber = team.assigneTeamRowNumber;
                                                cm.currentExternalUser.userIndex = i;
                                                showNotificatoinMessages(team.assigneTeamRowNumber);
                                                cm.getExternalUserNotification = false;
                                            }
                                            return false;
                                        }
                                    }

                                });
                                cm.notificationPopUpBlock = true;
                                cm.getExternalUserNotification = false;
                            }
                            else {
                                cm.notificationPopUpBlock = false;
                                angular.forEach(cm.assignPermissionTeams, function (team) {
                                    var userEmail = getUserName(team.assignedUser, false);
                                    userEmail = cleanArray(userEmail);
                                    var userAliasNames = getUserName(team.assignedUser, true);
                                    userAliasNames = cleanArray(userAliasNames);
                                    for (var i = 0; i < userEmail.length; i++) {
                                        if (userEmail[i] == email) {
                                            cm.textInputUser = team;
                                            team.userExsists = response.isUserExistsInSite;
                                            team.userConfirmation = true;
                                            cm.currentExternalUser.userName = userEmail[i];
                                            cm.currentExternalUser.rowNumber = team.assigneTeamRowNumber;
                                            cm.currentExternalUser.userIndex = i;
                                            cm.confirmUser(true);
                                            team.assignedUser = team.assignedAllUserNamesAndEmails;
                                            if (-1 == cm.oSiteUsers.indexOf(userAliasNames[i])) {
                                                cm.oSiteUsers.push(userAliasNames[i]);
                                            }
                                            if (-1 == cm.oSiteUserNames.indexOf(userEmail[i])) {
                                                cm.oSiteUserNames.push(userEmail[i]);
                                            }
                                            var userDetails = {};
                                            userDetails.userName = userEmail[i];
                                            userDetails.userExsists = team.userExsists;
                                            userDetails.userConfirmation = true;
                                            if (!team.teamUsers) {
                                                team.teamUsers = [];
                                            }
                                            var isRowPresent = $filter("filter")(team.teamUsers, userEmail[i]);
                                            if (isRowPresent.length == 0) {
                                                team.teamUsers.push(userDetails);
                                            }
                                        }
                                    }
                                });
                            }
                            cm.popupContainerBackground = "hide";
                        });
                    }

                }
                else {
                    angular.forEach(cm.assignPermissionTeams, function (team) {
                        var userEmail = getUserName(team.assignedUser, false)
                        for (var i = 0; i < userEmail.length; i++) {
                            if (userEmail[i] == email) {
                                cm.errTextMsg = cm.createContent.ErrorMessageEntityUsers3
                                // cm.errTextMsg = "Please enter a valid email address.";
                                cm.errorBorder = "";
                                cm.errorStatus = true;
                                cm.errorPopUpBlock = true;
                                showErrorNotificationAssignTeams(cm.errTextMsg, team.assigneTeamRowNumber, "user")
                                team.userConfirmation = false;
                                angular.element('#txtUser' + team.assigneTeamRowNumber).attr('confirm', "false");
                                cm.errorBorder = "txtUser" + team.assigneTeamRowNumber;
                                return false;
                            }
                        }

                    });
                    cm.invalidUserCheck = false;
                }
            }
            if (userMailId && userMailId != "") {
                var userMailIdTerm = getUserName(userMailId + ";", false);
                userMailIdTerm = cleanArray(userMailIdTerm);
                for (var i = 0; i < userMailIdTerm.length; i++) {
                    userMailIdTerm[i] = userMailIdTerm[i];
                    validate(userMailIdTerm[i]);
                }

            }
        }

        function cleanArray(actual) {
            var newArray = new Array();
            for (var i = 0; i < actual.length; i++) {
                if (actual[i] && actual[i] != "") {
                    newArray.push(actual[i]);
                }
            }
            return newArray;
        }

        function showErrorNotificationAssignTeams(errorMsg, teamRowNumber, type) {
            var fieldType = "";

            if (type == "user") {
                fieldType = "txtUser";
            }
            else if (type == "role") { fieldType = "roleUser" }
            else if (type == "perm") {
                fieldType = "permUser";
            }
            else if (type == "btnCreateMatter") {
                fieldType = "btnCreateMatter";
                teamRowNumber = "";
            }

            var temp = angular.element('#' + fieldType + teamRowNumber).parent().position();


            var matterErrorEle = document.getElementById("errorBlock");
            var matterErrorTrinageleBlockEle = document.getElementById("errTrinagleBlock");
            var matterErrorTrinagleBorderEle = document.getElementById("errTrinagleBroderBlock");
            var matterErrorTextEle = document.getElementById("errText");
            matterErrorEle.className = ""; matterErrorTrinageleBlockEle.className = ""; matterErrorTrinagleBorderEle.className = ""; matterErrorTextEle.className = "";
            matterErrorEle.classList.add("errorPopUp");
            matterErrorTrinageleBlockEle.classList.add("errTriangle");
            matterErrorTrinageleBlockEle.classList.add("popUpFloatLeft");
            matterErrorTrinagleBorderEle.classList.add("errTriangleBorder");
            matterErrorTrinagleBorderEle.classList.add("popUpFloatLeft");
            matterErrorTextEle.classList.add("errText");
            matterErrorTextEle.classList.add("popUpFloatRight");
            var errPopUpCAttorny = document.createElement('style'),
                errTringleBlockCAttorny = document.createElement('style'),
                errTringleBorderCAttorny = document.createElement('style'),
                errTextMatterCAttorny = document.createElement('style');
            errPopUpCAttorny.type = 'text/css';
            errTringleBlockCAttorny.type = 'text/css';
            errTringleBorderCAttorny.type = 'text/css';
            errTextMatterCAttorny.type = 'text/css';

            var width = GetWidth();
            var x = 0, y = 0;
            if (width > 734) {
                y = temp.top - 85, x = temp.left - 25;
            }
            else {
                y = temp.offsetTop, x = temp.offsetLeft;
            }

            errPopUpCAttorny.innerHTML = ".errPopUpCAttorny{top:" + y + "px;left:" + x + "px;}";
            errTringleBlockCAttorny.innerHTML = "{min-height: 40px;top: 17px !important;left: 24px;width:100%}";
            errTringleBorderCAttorny.innerHTML = "{min-height: 40px,top: 17px !important;left: 24px;width:100%}";
            errTextMatterCAttorny.innerHTML = "{min-height:40px;top:21px !important;left: 24px;width:100%}";
            document.getElementsByTagName('head')[0].appendChild(errPopUpCAttorny);
            document.getElementsByTagName('head')[0].appendChild(errTringleBlockCAttorny);
            document.getElementsByTagName('head')[0].appendChild(errTringleBorderCAttorny);
            document.getElementsByTagName('head')[0].appendChild(errTextMatterCAttorny);
            cm.errTextMsg = errorMsg;
            cm.errorPopUpBlock = true;
            matterErrorEle.classList.add("errPopUpCAttorny");
            matterErrorTrinageleBlockEle.classList.add("errTringleBlockCAttorny");
            matterErrorTrinagleBorderEle.classList.add("errTringleBorderCAttorny");
            matterErrorTextEle.classList.add("errTextMatterCAttorny");
        }
        //#region Utilty functions

        var getUserName = function (sUserEmails, bIsName) {
            "use strict";
            var arrUserNames = [], sEmail = "", oEmailRegex = new RegExp(cm.oEmailRegExpr);
            if (sUserEmails && null !== sUserEmails && "" !== sUserEmails) {
                arrUserNames = sUserEmails.split(";");
                for (var iIterator = 0; iIterator < arrUserNames.length - 1; iIterator++) {
                    if (arrUserNames[iIterator] && null !== arrUserNames[iIterator] && "" !== arrUserNames[iIterator]) {
                        if (-1 !== arrUserNames[iIterator].lastIndexOf("(")) {
                            sEmail = $.trim(arrUserNames[iIterator].substring(arrUserNames[iIterator].lastIndexOf("(") + 1, arrUserNames[iIterator].lastIndexOf(")")));
                            if (oEmailRegex.test(sEmail)) {
                                arrUserNames[iIterator] = bIsName ? $.trim(arrUserNames[iIterator].substring(0, arrUserNames[iIterator].lastIndexOf("("))) : sEmail;
                            }
                        }
                    }
                }
            }
            return arrUserNames;
        }
        cm.oMandatoryRoleNames = [];
        function validateTeamAssigmentRole() {
            var oAssignList = cm.assignPermissionTeams
            , iExpectedCount = 0, iActualCount = 0, iIterator = 0, iLength = cm.assignRoles.length;
            for (iIterator = 0; iIterator < iLength; iIterator++) {
                if (cm.assignRoles[iIterator].mandatory) {
                    iExpectedCount++;
                    cm.oMandatoryRoleNames.push(cm.assignRoles[iIterator].name);
                }
            }
            angular.forEach(oAssignList, function (oItem) {
                if (true == oItem.assignedRole.mandatory) {
                    iActualCount++;
                }
            });
            if (iExpectedCount <= iActualCount) {
                return true;
            }
            return false;
        }

        /* Function to validate Permission */
        function validatePermission() {
            "use strict";
            var oPermissionList = cm.assignPermissionTeams, bIsFullControl = false;
            var Edit_Matter_Mandatory_Permission_Level = "Full Control";
            angular.forEach(oPermissionList, function (oPermissionList, oPermissionListItem) {
                if (oPermissionListItem) {
                    if (Edit_Matter_Mandatory_Permission_Level === oPermissionListItem.assignedPermission.name) {
                        bIsFullControl = true;
                    }
                }
            });
            return bIsFullControl;
        }

        function getUserEmail(arrUsersEmails) {
            var sEmail = "";
            if (arrUsersEmails && 0 < arrUsersEmails.length) {
                for (var nCount = 0; nCount < arrUsersEmails.length; nCount++) {
                    if ("" !== arrUsersEmails[nCount]) {
                        sEmail = arrUsersEmails[nCount];
                    }
                }
            }
            return sEmail;
        }

        function getArrAssignedUserNamesAndEmails() {
            cm.arrAssignedUserName = [], cm.arrAssignedUserEmails = [], cm.userIDs = [];
            var count = 1;
            angular.forEach(cm.assignPermissionTeams, function (team) { //For loop
                cm.arrAssignedUserName.push(getUserName(team.assignedUser + ";", true));
                cm.arrAssignedUserEmails.push(getUserName(team.assignedUser + ";", false));
                cm.userIDs.push("txtAssign" + count++);
            });
        }

        function getAssignedUserRoles() {
            "use strict";
            var arrAssigneTeams = cm.assignPermissionTeams, nCount = 0, nlength, arrRoles = [];
            if (arrAssigneTeams) {
                nlength = arrAssigneTeams.length;
                for (nCount = 0; nCount < nlength; nCount++) {
                    if (arrAssigneTeams[nCount] && arrAssigneTeams[nCount].assignedRole) {
                        if (arrAssigneTeams[nCount].assignedRole && arrAssigneTeams[nCount].assignedRole.name) {
                            if ("" !== arrAssigneTeams[nCount].assignedRole.name) {
                                arrRoles.push(arrAssigneTeams[nCount].assignedRole.name);
                            }
                        }
                    }
                }
            }
            return arrRoles;
        }

        function getAssignedUserPermissions() {
            "use strict";
            var arrAssigneTeams = cm.assignPermissionTeams, nCount = 0, nlength, arrAssignRoles, arrPermissions = [];
            if (arrAssigneTeams) {
                nlength = arrAssigneTeams.length;
                for (nCount = 0; nCount < nlength; nCount++) {
                    if (arrAssigneTeams[nCount] && arrAssigneTeams[nCount].assignedPermission) {
                        if (arrAssigneTeams[nCount].assignedPermission && arrAssigneTeams[nCount].assignedPermission.name) {
                            if ("" !== arrAssigneTeams[nCount].assignedPermission.name) {
                                arrPermissions.push(arrAssigneTeams[nCount].assignedPermission.name);
                            }
                        }
                    }
                }
            }
            return arrPermissions;
        }
        var validateAttornyUserRolesAndPermissins = function () {
            var responsibleAttorny = 0, fullControl = 0;
            if (!cm.showRoles) {
                assignDefaultRolesToTeamMembers();
            }
            for (var iCount = 0; iCount < cm.assignPermissionTeams.length; iCount++) {

                if ("" !== cm.assignPermissionTeams[iCount].assignedUser) {

                    if (cm.assignPermissionTeams[iCount].assignedRole && "" !== cm.assignPermissionTeams[iCount].assignedRole.name) {
                        if (cm.assignPermissionTeams[iCount].assignedPermission && "" != cm.assignPermissionTeams[iCount].assignedPermission.name) {
                            if (cm.assignPermissionTeams[iCount].assignedRole.mandatory) {
                                responsibleAttorny++;
                            }
                            if (cm.assignPermissionTeams[iCount].assignedPermission.name == "Full Control") {
                                fullControl++;
                            }

                        }
                        else {
                            cm.errTextMsg = cm.createContent.ErrorMessageEntityPermission;
                            // cm.errTextMsg = "Please provide at least one permission on this  matter. ";
                            cm.errorBorder = "";
                            cm.errorPopUpBlock = true;
                            return false;
                        }
                    }
                    else {
                        cm.errorPopUpBlock = true;
                        cm.errTextMsg = cm.createContent.ErrorMessageEntityTeamRole1;
                        // cm.errTextMsg = "Enter at least one role for this matter.";
                        cm.errorBorder = "";
                        return false;
                    }
                }
                else {
                    cm.errTextMsg = cm.createContent.ErrorMessageTeamMember1;
                    // cm.errTextMsg = cm.assignPermissionTeams[iCount].assignedRole.name + " cannot be empty.";
                    cm.errorBorder = "";
                    showErrorNotificationAssignTeams(cm.errTextMsg, cm.assignPermissionTeams[iCount].assigneTeamRowNumber, "user");
                    cm.errorPopUpBlock = true;
                    return false;
                }
            }

            if (responsibleAttorny >= 1) {
                if (fullControl >= 1) {
                    return true;
                }
                else {
                    cm.errTextMsg = cm.createContent.ErrorMessageEntityTeamPermission2;
                    // cm.errTextMsg = "Please provide at least one user who has Full Control permission on this  matter.";
                    cm.errorBorder = "permUser" + cm.assignPermissionTeams[0].assigneTeamRowNumber;
                    showErrorNotificationAssignTeams(cm.errTextMsg, cm.assignPermissionTeams[0].assigneTeamRowNumber, "perm");
                    cm.errorPopUpBlock = true;
                    return false;
                }
            }
            else {
                cm.errTextMsg = cm.createContent.ErrorMessageEntityTeamRole2;
                // cm.errTextMsg = "Enter at least one Responsible Attorney for this matter.";
                cm.errorBorder = "roleUser" + cm.assignPermissionTeams[0].assigneTeamRowNumber;
                showErrorNotificationAssignTeams(cm.errTextMsg, cm.assignPermissionTeams[0].assigneTeamRowNumber, "role");
                cm.errorPopUpBlock = true;
                return false;
            }
        }

        //setting the team  roles to default i.e responsible attrony when showRole is false from default settings.
        function assignDefaultRolesToTeamMembers() {
            if (!cm.showRoles) {
                var arrAssigneTeams = cm.assignPermissionTeams, nCount = 0, nlength;
                if (arrAssigneTeams) {
                    nlength = arrAssigneTeams.length;
                    for (nCount = 0; nCount < nlength; nCount++) {
                        if (arrAssigneTeams[nCount] && arrAssigneTeams[nCount].assignedUser && "" !== arrAssigneTeams[nCount].assignedUser) {
                            angular.forEach(cm.assignRoles, function (role) {
                                if (role.mandatory) {
                                    arrAssigneTeams[nCount].assignedRole = role;
                                }
                            });
                        }
                    }
                }
            }
        }

        cm.onSelect = function ($item, $model, $label, value, fucnValue, $event, username) {
            var typeheadelelen = angular.element('.dropdown-menu li').length;
            var noresults = true;
            if (typeheadelelen == 1) {
                if (angular.element('.dropdown-menu li a')[0]) {
                    if (angular.element('.dropdown-menu li a')[0].innerHTML == "No results found") {
                        noresults = false;
                        if ($event.keyCode == 9 || $event.keyCode == 13) {
                            cm.user = angular.element('#' + $event.currentTarget.id).val();
                        }
                    }
                }
            }
            if ($item && $item.name !== "No results found") {
                if (value == "team") {
                    if ($label.assignedAllUserNamesAndEmails && $label.assignedAllUserNamesAndEmails.indexOf(';') > -1) {
                        $label.assignedUser = $item.name + '(' + $item.email + ');';
                        if ($label.assignedAllUserNamesAndEmails.indexOf($item.name) == -1) {
                            if ($label.assignedAllUserNamesAndEmails.indexOf($item.email) > -1) {
                                $label.assignedAllUserNamesAndEmails = $label.assignedAllUserNamesAndEmails.replace($item.email + ";", "");
                            }
                            $label.assignedAllUserNamesAndEmails = $label.assignedAllUserNamesAndEmails + $label.assignedUser;
                            $label.assignedUser = $label.assignedAllUserNamesAndEmails;
                        } else {
                            $label.assignedUser = $label.assignedAllUserNamesAndEmails;
                        }
                    }
                    else {
                        $label.assignedUser = $item.name + '(' + $item.email + ');';
                        $label.assignedAllUserNamesAndEmails = $item.name + '(' + $item.email + ');';
                    }
                    cm.typehead = false;
                    cm.notificationPopUpBlock = false;
                }

                if (-1 == cm.oSiteUsers.indexOf($item.email)) {
                    cm.oSiteUsers.push($item.email);
                }
                if (-1 == cm.oSiteUserNames.indexOf($item.name)) {
                    cm.oSiteUserNames.push($item.name);
                }
                $label.userConfirmation = false;
                cm.checkUserExists($label);
            }
            else {
                if (fucnValue == "on-blurr") {
                    cm.user = username;
                    $label.assignedAllUserNamesAndEmails = $label.assignedUser;
                    var userEmailTxt = "";
                    var userNames = getUserName($label.assignedUser, true);
                    var userEmails = getUserName($label.assignedUser, false);
                    var exsistingTeams = [];
                    for (var i = 0; i < userEmails.length; i++) {
                        if (userEmails[i] != "" && validateEmail(userEmails[i])) {
                            angular.forEach($label.teamUsers, function (team) {
                                if (team.userName == userEmails[i]) {
                                    exsistingTeams.push(team);
                                }
                            });
                            var userNameAndEmailTxt = (userNames[i] == userEmails[i]) ? userEmails[i] : userNames[i] + "(" + userEmails[i] + ")";
                            userEmailTxt = userEmailTxt + userNameAndEmailTxt + ";";
                        }
                    }
                    $label.assignedAllUserNamesAndEmails = userEmailTxt;
                    $label.teamUsers = exsistingTeams;
                }
                if (fucnValue == "on-blurr") {
                    if (typeheadelelen == 0 && noresults) {
                        cm.checkUserExists($label, $event);
                    } else if (typeheadelelen >= 1 && !noresults) {
                        cm.checkUserExists($label, $event);
                        $("[uib-typeahead-popup].dropdown-menu").css("display", "none");
                    }
                }
                if (!noresults) {
                    if (value == "team") {
                        $label.assignedUser = "";
                        $label.assignedUser = cm.user;
                    }
                }
            }
        }

        cm.confirmUser = function (confirmUser) {
            if (confirmUser) {
                cm.notificationPopUpBlock = false;
                cm.notificationBorder = "";
                var userEmail = getUserName(cm.textInputUser.assignedUser, false);
                userEmail = cleanArray(userEmail);
                for (var i = 0; i < userEmail.length; i++) {
                    if (i == cm.currentExternalUser.userIndex && userEmail[i] == cm.currentExternalUser.userName && userEmail[i] != "") {
                        angular.forEach(cm.textInputUser.teamUsers, function (teamUser) {
                            if (teamUser.userName == userEmail[i]) {
                                teamUser.userConfirmation = true;
                                teamUser.userExsists = teamUser.userExsists;
                            }
                        });
                    }
                }
                cm.textInputUser.userConfirmation = true;
                cm.getExternalUserNotification = true;
                angular.element('#txtUser' + cm.textInputUser.assigneTeamRowNumber).attr('uservalue', cm.textInputUser.assignedUser);
                angular.element('#txtUser' + cm.textInputUser.assigneTeamRowNumber).attr('confirm', "true");
                angular.element('#txtUser' + cm.textInputUser.assigneTeamRowNumber).css('border-color', '#ccc');
            } else {
                cm.notificationPopUpBlock = false;
                cm.getExternalUserNotification = true;
                var userEmail = getUserName(cm.textInputUser.assignedUser, false);
                var userNames = getUserName(cm.textInputUser.assignedUser, true);
                userEmail = cleanArray(userEmail);
                userNames = cleanArray(userNames);
                var updatedUserEmail = "";
                for (var i = 0; i < userEmail.length; i++) {
                    if (i != cm.currentExternalUser.userIndex && userEmail[i] != cm.currentExternalUser.userName && userEmail[i] != "") {
                        if (userNames[i] == userEmail[i]) {
                            updatedUserEmail = updatedUserEmail + userEmail[i] + ";";
                        } else {
                            updatedUserEmail = updatedUserEmail + userNames[i] + "(" + userEmail[i] + ");";
                        }
                    }
                }
                cm.textInputUser.assignedUser = updatedUserEmail;
                cm.textInputUser.userExsists = false;
                cm.textInputUser.userConfirmation = false;
                cm.notificationBorder = "";
            }

            angular.forEach(cm.assignPermissionTeams, function (team) {
                var keepGoing = true;
                if (keepGoing) {
                    if (team.assignedUser && team.assignedUser != "") {//For loop
                        var usersEmails = getUserName(team.assignedUser, false);
                        usersEmails = cleanArray(usersEmails);
                        for (var j = 0; j < usersEmails.length; j++) {
                            angular.forEach(team.teamUsers, function (teamUser) {
                                if (keepGoing) {
                                    if (teamUser.userName == usersEmails[j]) {
                                        if (!teamUser.userConfirmation) {
                                            cm.textInputUser = team;
                                            cm.currentExternalUser.rowNumber = team.assigneTeamRowNumber;
                                            cm.currentExternalUser.userIndex = j;
                                            cm.currentExternalUser.userName = teamUser.userName;

                                            showNotificatoinMessages(team.assigneTeamRowNumber);
                                            cm.notificationPopUpBlock = true;
                                            keepGoing = false;
                                            return false;
                                        }
                                    }
                                }
                            });
                        }
                    }
                }
            });
        }

        function showNotificatoinMessages(teamRowNumber) {
            var temp = angular.element('#txtUser' + teamRowNumber).parent().position();
            var notificationEle = document.getElementById("notificationBlock");
            var notificationTrinageleBlockEle = document.getElementById("notificatoinTrinagleBlock");
            var notificationTrinagleBorderEle = document.getElementById("notificationTrinagleBroderBlock");
            var notificationTextEle = document.getElementById("notificationText");
            notificationEle.className = ""; notificationTrinageleBlockEle.className = ""; notificationTrinagleBorderEle.className = ""; notificationTextEle.className = "";
            notificationEle.classList.add("notificationPopUp");
            notificationTrinageleBlockEle.classList.add("notificatonTriangle");
            notificationTrinageleBlockEle.classList.add("popUpFloatLeft");
            notificationTrinagleBorderEle.classList.add("notificationTriangleBorder");
            notificationTrinagleBorderEle.classList.add("popUpFloatLeft");
            notificationTextEle.classList.add("notificatonText");
            notificationTextEle.classList.add("popUpFloatRight");
            var notifcationPopUpCAttorny = document.createElement('style'),
                notifcationTringleBlockCAttorny = document.createElement('style'),
                notifcationTringleBorderCAttorny = document.createElement('style'),
                notifcationTextMatterCAttorny = document.createElement('style');
            notifcationPopUpCAttorny.type = 'text/css';
            notifcationTringleBlockCAttorny.type = 'text/css';
            notifcationTringleBorderCAttorny.type = 'text/css';
            notifcationTextMatterCAttorny.type = 'text/css';

            var width = GetWidth();
            var x = 0, y = 0;
            if (width > 734) {
                y = temp.top - 108, x = temp.left + 70;
            }
            else {
                y = temp.offsetTop, x = temp.offsetLeft;
            }
            cm.notificationBorder = "txtUser" + teamRowNumber;

            notifcationPopUpCAttorny.innerHTML = ".notifcationPopUpCAttorny{top:" + y + "px;left:" + x + "px;}";
            notifcationTringleBlockCAttorny.innerHTML = "{min-height: 40px;top: 17px !important;left: 24px;width:100%}";
            notifcationTringleBorderCAttorny.innerHTML = "{min-height: 40px,top: 17px !important;left: 24px;width:100%}";
            notifcationTextMatterCAttorny.innerHTML = "{min-height:40px;top:21px !important;left: 24px;width:100%}";
            document.getElementsByTagName('head')[0].appendChild(notifcationPopUpCAttorny);
            document.getElementsByTagName('head')[0].appendChild(notifcationTringleBlockCAttorny);
            document.getElementsByTagName('head')[0].appendChild(notifcationTringleBorderCAttorny);
            document.getElementsByTagName('head')[0].appendChild(notifcationTextMatterCAttorny);

            notificationEle.classList.add("notifcationPopUpCAttorny");
            notificationTrinageleBlockEle.classList.add("notifcationTringleBlockCAttorny");
            notificationTrinagleBorderEle.classList.add("notifcationTringleBorderCAttorny");
            notificationTextEle.classList.add("notifcationTextCAttorny");
        }

        function GetWidth() {
            "use strict";
            var x = 0;
            if (self.innerHeight) {
                x = self.innerWidth;
            } else if (document.documentElement && document.documentElement.clientHeight) {
                x = document.documentElement.clientWidth;
            } else if (document.body) {
                x = document.body.clientWidth;
            }
            return x;
        }


        function validateUsers() {
            var keepGoing = true;
            var blockedUserEmail = cm.matterProperties.matterObject.blockUserNames;

            angular.forEach(cm.assignPermissionTeams, function (team) {
                if (keepGoing) {
                    if (team.assignedUser && team.assignedUser != "") {//For loop                                           
                        var usersEmails = getUserName(team.assignedUser, false);
                        usersEmails = cleanArray(usersEmails);
                        var usersAliasNames = getUserName(team.assignedUser, true);
                        usersAliasNames = cleanArray(usersAliasNames);
                        if (usersEmails.length !== team.teamUsers.length) {
                            cm.checkUserExists(team);
                            keepGoing = false;
                            return false;
                        } else {
                            for (var j = 0; j < usersEmails.length; j++) {
                                angular.forEach(team.teamUsers, function (teamUser) {
                                    if (keepGoing) {
                                        if (teamUser.userName == usersEmails[j]) {
                                            if (teamUser.userExsists) {
                                                if (-1 == cm.oSiteUsers.indexOf(usersEmails[j]) || -1 == cm.oSiteUserNames.indexOf(usersAliasNames[j])) {
                                                    cm.errTextMsg = cm.createContent.ErrorMessageEntityUsers1;
                                                    // cm.errTextMsg = "Please enter valid team members.";
                                                    cm.errorBorder = "";
                                                    cm.errorPopUpBlock = true;
                                                    showErrorNotificationAssignTeams(cm.errTextMsg, team.assigneTeamRowNumber, "user")
                                                    cm.errorBorder = "txtUser" + team.assigneTeamRowNumber; keepGoing = false;
                                                    return false;
                                                }

                                                if (blockedUserEmail && blockedUserEmail != "") {
                                                    blockedUserEmail = cleanArray(blockedUserEmail);
                                                    for (var i = 0; i < blockedUserEmail.length; i++) {
                                                        if (usersEmails[j] == blockedUserEmail[i]) {
                                                            cm.errTextMsg = cm.createContent.ErrorMessageEntityUsers2;
                                                            //"Please enter individual who is not conflicted.";
                                                            cm.errorBorder = "";
                                                            cm.errorPopUpBlock = true;
                                                            showErrorNotificationAssignTeams(cm.errTextMsg, team.assigneTeamRowNumber, "user")
                                                            cm.errorBorder = "txtUser" + team.assigneTeamRowNumber; keepGoing = false;
                                                            return false;
                                                        }
                                                    }
                                                }
                                            } else {
                                                if (!teamUser.userConfirmation) {
                                                    cm.textInputUser = team;
                                                    cm.currentExternalUser.rowNumber = team.assigneTeamRowNumber;
                                                    cm.currentExternalUser.userIndex = j;
                                                    cm.currentExternalUser.userName = teamUser.userName;

                                                    showNotificatoinMessages(team.assigneTeamRowNumber);
                                                    cm.notificationPopUpBlock = true;
                                                    keepGoing = false;
                                                    return false;
                                                }
                                            }
                                        }
                                    }
                                });
                            }
                        }
                    }
                    else {
                        showErrorNotificationAssignTeams(cm.createContent.ErrorMessageTeamMember1, team.assigneTeamRowNumber, "user")
                        cm.errorBorder = "txtUser" + team.assigneTeamRowNumber;
                        keepGoing = false;
                        return false;
                    }
                }
            });

            if (keepGoing) {
                return true;
            } else {
                return false;
            }
        }

        cm.UpdateMatter = function ($event) {
            cm.popupContainerBackground = "Show";
            if ($event) {
                $event.stopPropagation();
            }
            var arrUserNames = [],
                arrUserEmails = [],
                arrTeamMembers = [],
                roleInformation = {},
                arrReadOnlyUsers = [],
                sResponsibleAttorney = [],
                sResponsibleAttorneyEmail = [];
            var arrBlockUserNames = cm.matterProperties.matterObject.blockUserNames ? cm.matterProperties.matterObject.blockUserNames : ""

            var attornyCheck = validateAttornyUserRolesAndPermissins($event);
            var validUsersCheck = validateUsers();
            if (validUsersCheck) {
                var checkUserDExists = validateCheckUserExisits();
                if (attornyCheck && validUsersCheck && checkUserDExists) {
                    angular.forEach(cm.assignPermissionTeams, function (item) {
                        if ("" !== item.assignedRole && "" !== item.assignedPermission) {
                            if (roleInformation.hasOwnProperty(item.assignedRole.name)) {
                                roleInformation[item.assignedRole.name] = roleInformation[item.assignedRole.name] + ";" + item.assignedUser;
                            }
                            else {
                                roleInformation[item.assignedRole.name] = item.assignedUser;
                            }
                        }
                    });

                    angular.forEach(cm.assignPermissionTeams, function (item) {
                        arrUserNames.push(getUserName(item.assignedUser.trim() + ";", true));
                        arrUserEmails.push(getUserName(item.assignedUser.trim() + ";", false));
                        arrTeamMembers.push(getUserName(item.assignedUser.trim() + ";", true).join(";"));
                        var User_Upload_Permissions = "Read";
                        angular.forEach(cm.assignPermissionTeams, function (item) {
                            if (item.assignedPermission.name.toLowerCase() === User_Upload_Permissions.toLowerCase()) {
                                arrReadOnlyUsers.push(getUserName(item.assignedRole.name.trim() + ";", false).join(";"), ";");
                            }
                        });

                    });

                    validateTeamAssigmentRole();
                    getArrAssignedUserNamesAndEmails();
                    var arrRoles = getAssignedUserRoles();
                    var arrPermissions = getAssignedUserPermissions();
                    angular.forEach(cm.assignPermissionTeams, function (item) {
                        if (1 <= cm.assignPermissionTeams.length) {
                            if ("" !== item.assignedRole && "" !== item.assignedPermission) {
                                if (-1 !== cm.oMandatoryRoleNames.indexOf(item.assignedRole.name)) {
                                    sResponsibleAttorney.push(getUserName(item.assignedUser + ";", true).join(";"));
                                    sResponsibleAttorneyEmail.push(getUserName(item.assignedUser + ";", false).join(";"));
                                }
                            }
                        }
                    });

                    var updatedMatterUsers = {
                        Client: {
                            Url: cm.clientUrl,
                            Id: "",
                            Name: ""
                        },
                        Matter: {
                            Name: cm.matterName,
                            BlockUserNames: arrBlockUserNames,
                            AssignUserNames: arrUserNames,
                            AssignUserEmails: arrUserEmails,
                            Permissions: arrPermissions,
                            Roles: arrRoles,
                            Conflict: {
                                Identified: cm.sConflictScenario
                            },
                            FolderNames: [],
                            DefaultContentType: "",
                            ContentTypes: [],
                            Description: "",
                            Id: "",
                            MatterGuid: cm.matterProperties.matterObject.matterGuid

                        },
                        MatterDetails: {
                            PracticeGroup: "",
                            AreaOfLaw: "",
                            SubareaOfLaw: "",
                            ResponsibleAttorney: sResponsibleAttorney.join(";").replace(/;;/g, ";"),
                            ResponsibleAttorneyEmail: sResponsibleAttorneyEmail.join(";").replace(/;;/g, ";"),
                            UploadBlockedUsers: arrReadOnlyUsers,
                            TeamMembers: arrTeamMembers.join(";"),
                            RoleInformation: JSON.stringify(roleInformation)
                        },
                        EditMode: cm.isEdit,
                        UserIds: cm.userIDs,
                        SerializeMatter: "",
                        Status: ""
                    }

                    updateMatterPermissions(updatedMatterUsers, function (response) {
                        if (!response.isError) {

                            cm.popupContainerBackground = "hide";
                        }
                    });
                }
                else {
                    cm.popupContainerBackground = "hide";
                }
            }
            else {
                cm.popupContainerBackground = "hide";
            }
        }

        function setTeamConfirmationValues() {
            angular.forEach(cm.assignPermissionTeams, function (team) {
                if (team.userConfirmation) {
                    angular.element('#txtUser' + team.assigneTeamRowNumber).attr('confirm', "true");
                }
            });
        }

        function validateCheckUserExisits() {
            var validUsers = false; var keepGoing = true;
            setTeamConfirmationValues();
            angular.forEach(cm.assignPermissionTeams, function (team) {
                if (keepGoing) {
                    var userVal = angular.element('#txtUser' + team.assigneTeamRowNumber).attr('confirm');
                    if (userVal == "false") {
                        cm.textInputUser = team;
                        showNotificatoinMessages(team.assigneTeamRowNumber);
                        cm.notificationPopUpBlock = true;

                    }
                    validUsers = (userVal == "false") ? false : true;
                    if (!validUsers) {
                        keepGoing = false;
                    }
                }
            });
            return validUsers;
        }

        $rootScope.$on('disableOverlay', function (event, data) {
            cm.popupContainerBackground = "hide";
        });
        //#endregion
    }]);
})();