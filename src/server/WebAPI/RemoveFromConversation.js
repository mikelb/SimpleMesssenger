var express = require('express');
var router = express.Router();
var _ = require('lodash');
var async = require('async');

var Const = require("../lib/consts");
var Utils = require('../lib/utils');

var RequestHandlerBase = require('./RequestHandlerBase');
var UserModel = require('../Models/User');
var ConversationModel = require('../Models/Conversation');
var authenticator = require("./middleware/auth");

var SocketAPIHandler = require('../SocketAPI/SocketAPIHandler');

var RemoveFromConversation = function(){}

_.extend(RemoveFromConversation.prototype,RequestHandlerBase.prototype);

RemoveFromConversation.prototype.attach = function(router){

    var self = this;

   /**
     * @api {post} /api/v1/conversation/removeuser/[conversationid] Remove users to conversation
     * @apiName Remove users to conversation
     * @apiGroup WebAPI
     * @apiHeader {String} Access-Token Users unique access-token.
     * @apiDescription Remove users from owned conversation
     * @apiParam {array} users array of userid.
     * @apiParamExample {json} Request-Example:
            {
                users: [
                    "563a0cc46cb168c8e9c4071a",
                    "563a0cc46cb168c8e9c4071a"
                ]
            }
     * @apiSuccessExample Success-Response:
    
{
    success: 1,
    data: {
        conversation: {
            __v: 0,
            owner: '563a1130b75fb0d5eb4b5a22',
            name: 'testiCqIm,
            thename...',
            created: 1446646065228,
            _id: '563a1131b75fb0d5eb4b5a2a',
            avatar: {
                file: 'EDDggQd7MoK6LpKQQ84PWbQVVdpjexYh',
                thumb: 'EDDggQd7MoK6LpKQQ84PWbQVVdpjexYh'
            },
            users: [
                '563a1130b75fb0d5eb4b5a22',
                '563a1130b75fb0d5eb4b5a20',
                '563a1130b75fb0d5eb4b5a21'
            ]
        }
    }
}

    */

    router.post('/:conversationid',authenticator,function(request,response){

        var conversationId = request.params.conversationid;

        // check new password
        var validateError = 0;

        if(_.isEmpty(conversationId))
            validateError = Const.resCodeRemoveUserNoConversationID;
            
        if(_.isEmpty(request.body.users))
            validateError = Const.resCodeRemoveUserNoUser;

        if(!_.isEmpty(validateError)){
                        
            self.successResponse(response,validateError);
            
            return;
            
        }
        
        var conversationModel = ConversationModel.get();
        
        async.waterfall([
            
            function (done) {
                
                var result = {};
                
                var conversation = conversationModel.findOne({_id:conversationId},function(err, resultConvesation) {
        
                    if(err){

                        self.successResponse(response,Const.resCodeRemoveUserWrongConvesationID);
                        
                        return;
                    }
                            
                    if(!result){
                        
                        self.successResponse(response,Const.resCodeRemoveUserWrongConvesationID);
                        
                        return;
                        
                    }
                    
                    var userIdFromRequest = request.user.id;
                    
                    if(resultConvesation.users.indexOf(userIdFromRequest) == -1){

                        self.successResponse(response,Const.resCodeRemoveUserWrongUserID);
                        
                        return;
                        
                    }

                    if(resultConvesation.owner.toString() != userIdFromRequest){

                        self.successResponse(response,Const.resCodeRemoveUserDeniedByPermission);
                        
                        return;
                        
                    }
                    
                    result.conversation = resultConvesation;
                    
                    done(err,result);
                                
                });
                
            },
            function (result,done){
                
                // convert telnum to userid
                var userIdsOrig = request.body.users;
                var telNums = [];
                var userIds = [];
                
                if(_.isEmpty(userIdsOrig)){
                    done(null,result);
                    return;    
                }
                
                
                for(var i = 0 ; i < userIdsOrig.length ; i++){
                    
                    if(!Utils.isObjectId(userIdsOrig[i])){
                        
                        telNums.push(userIdsOrig[i]);
                        
                    }else{
                        userIds.push(userIdsOrig[i]);
                    }
                    
                }
                
                if(telNums.length == 0){
                    done(null,result);
                    return;    
                }
                
                
                UserModel.get().find({
                
                    telNumber:{$in:telNums},
                    
                },function(err,resultUsers){
                    
                    _.forEach(resultUsers,function(resultUser){
                        
                        userIds.push(resultUser._id.toString());
                                              
                    });              
                                        
                    request.body.users = userIds;
                    
                    done(err,result);
    
                });     
                        
                  
            },
            function (result,done){
                                
                var users = result.conversation.users;
                                
                var removed = _.filter(users,function(userId) {
                    return request.body.users.indexOf(userId.toString()) == -1
                });
    
                result.conversation.update({
                    users : removed
                },{},function(err,resutlSave){
                    result.updatedUsers = removed;
                    done(err,result);
                })
                
                
            }
        
        ],function(err,result){
                        
            if(err){
                console.log(err);
                self.errorResponse(response,Const.httpCodeServerError);
                return;
            }
            
            // populate with users
            UserModel.getUsersByIdForResponse(result.updatedUsers,function(resultUsers){
                
                result.conversation = result.conversation.toObject();                                
                result.conversation.users = resultUsers;

                
                self.successResponse(response,Const.responsecodeSucceed,{
                    conversation: result.conversation
                });
                
                // send socket
                _.forEach(request.body.users,function(userId){
                    
                    SocketAPIHandler.emitToUser(
                        userId,
                        Const.emitCommandRemoveFromConversation,
                        {conversation:result.conversation}
                    );
                     
                });

                SocketAPIHandler.emitToUser(
                    request.user._id,
                    Const.emitCommandRemoveFromConversation,
                    {conversation:result.conversation}
                );
                 
                     
            });
            
        });
            
                
    });

}

new RemoveFromConversation().attach(router);
module["exports"] = router;
