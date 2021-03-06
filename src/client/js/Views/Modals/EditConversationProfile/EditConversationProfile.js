var $ = require('jquery');
var _ = require('lodash');
var validator = require('validator');

var Conversation = require('../../../Models/conversation');

var Const = require('../../../lib/consts');

var Utils = require('../../../lib/utils.js');
var template = require('./EditConversationProfile.hbs');
var UpdateConversationClient = require('../../../lib/APIClients/UpdateConversationClient');
var ConversationDetailClient = require('../../../lib/APIClients/ConversationDetailClient');
var loginUserManager = require('../../../lib/loginUserManager');

var EditConversationProfile = {
	
	conversation: null,
	onFinish: null,
    show: function(conversation,onFinish) {
    
        var self = this;
        
        this.conversation = conversation;
        this.onFinish = onFinish;
        
        $('body').append(template({	
	        conversation:conversation.attributes
        }));
        $('#modal-conversationprofile').on('hidden.bs.modal', function(e) {
            $('#modal-conversationprofile').remove();
            
        })

        $('#modal-conversationprofile').on('show.bs.modal', function (e) {
            self.load();

            $('form [name="display-name"]').val(conversation.get('name'));
            $('form [name="description"]').val(conversation.get('description'));

        })
        
        $('#modal-conversationprofile').modal('show');
        $('#modal-btn-close').unbind().on('click', function() {
            self.hide();
        });
    },
    hide: function(onFinish) {
	    	    
	    var self = this;
	    
        if (!_.isUndefined(self.onFinish)) {
            
            ConversationDetailClient.send(this.conversation.get('id'),function(data){
                
                self.onFinish(Conversation.modelByResult(data.conversation));

            });
            
        }
        
        $('#modal-conversationprofile').modal('hide');
    },
    load : function(){
        
        var self = this;
        
        $('#modal-btn-save').unbind().on('click', function() {
            
            self.save();
            
        });
        
    },
    save : function(){
        
        $('#modal-conversationprofile .alert-danger').hide();
        
        var errorMessage = this.validate();
        
        if(!_.isEmpty(errorMessage)){
            
            $('#modal-conversationprofile .alert-danger').text(errorMessage);
            $('#modal-conversationprofile .alert-danger').show();
         
            return;   
        
        }
        
        this.doSave();
        
    },
    validate : function(){
        
        var displayName = $('form [name="display-name"]').val();
        
        if(_.isEmpty(displayName)){
            
            return Utils.l10n("Please input display name.");
            
        }
        
    },
    doSave : function(){
        
        var self = this;
        
        $('#modal-btn-save').attr('disabled','disabled');
        $('#modal-conversationprofile .progress').show();
        
        var displayName = $('form [name="display-name"]').val();
        var description = $('form [name="description"]').val();
        var file = $('form [name="file"]')[0].files[0];
                
        UpdateConversationClient.send(this.conversation.get('id'),displayName,description,file,function(response){
                        
            $('#modal-btn-save').removeAttr('disabled');
            $('#modal-conversationprofile .progress').hide();

            $('#modal-conversationprofile .alert-success').show();
            _.debounce(function(){
                
                self.hide();
                
            },500)();

        },function(progress){
            
            $('#modal-conversationprofile .progress-bar').css('width',progress * 100 + "%");
            
        },function(errCode){

            var message = "";
            
            if(Const.ErrorCodes[errCode])
                message = Utils.l10n(Const.ErrorCodes[errCode]);
            else
                message = Utils.l10n("Critical Error");
            
            $('#modal-conversationprofile .alert-danger').text(Utils.l10n("Fails to update profile, plase try again while after."));
            $('#modal-conversationprofile .alert-danger').show();

            $('#modal-conversationprofile .progress').hide();           
            $('#modal-btn-save').removeAttr('disabled'); 
            
        });
        
    }
    
}
module.exports = EditConversationProfile;