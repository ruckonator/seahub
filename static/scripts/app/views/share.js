define([
    'jquery',
    'jquery.ui', /* for tabs */
    'underscore',
    'backbone',
    'common',
    'app/views/folder-share-item'
], function($, jQueryUI, _, Backbone, Common, FolderShareItemView) {
    'use strict';

    var SharePopupView = Backbone.View.extend({
        tagName: 'div',
        id: 'share-popup',
        template: _.template($('#share-popup-tmpl').html()),

        initialize: function(options) {
            this.is_repo_owner = options.is_repo_owner;

            // for shared repo
            this.is_admin = options.is_admin; // true or undefined

            // for group owned repo
            this.is_address_book_group_admin = options.is_address_book_group_admin;
            this.parent_group_id = options.parent_group_id;

            this.is_virtual = options.is_virtual;
            this.user_perm = options.user_perm;
            this.repo_id = options.repo_id;
            this.repo_encrypted = options.repo_encrypted;
            this.dirent_path = options.dirent_path;
            this.obj_name = options.obj_name;
            this.is_dir = options.is_dir;

            // share to user/group
            var enable_dir_private_share = false;
            if (!this.is_virtual &&
                (this.is_repo_owner || this.is_admin ||
                (this.is_address_book_group_admin && this.dirent_path == '/'))) {
                enable_dir_private_share = true;
            }
            this.enable_dir_private_share = enable_dir_private_share;

            this.render();

            if ($(window).width() >= 768) {
                this.$el.modal({focus: false});
                $('#simplemodal-container').css({'width':'auto', 'height':'auto'});
            } else {
                this.$el.css({
                    'width': $(window).width() - 50,
                    'height': $(window).height() - 50,
                    'overflow': 'auto'
                }).modal({focus:false});
            }

            this.$("#share-tabs").tabs({});

            if (!this.repo_encrypted && app.pageOptions.can_generate_share_link) {
                this.downloadLinkPanelInit();
            }
            if (this.is_dir) {
                if (this.user_perm == 'rw' && !this.repo_encrypted && app.pageOptions.can_generate_upload_link) {
                    this.uploadLinkPanelInit();
                }
                if (this.enable_dir_private_share) {
                    this.dirUserSharePanelInit();
                    this.dirGroupSharePanelInit();

                    var _this = this;
                    $(document).on('click', function(e) {
                        var target = e.target || event.srcElement;
                        if (!_this.$('.perm-edit-icon, .perm-toggle-select').is(target)) {
                            _this.$('.perm').removeClass('hide');
                            _this.$('.perm-toggle-select').addClass('hide');
                        }
                    });
                }
            }
        },

        render: function () {
            var show_admin_perm_option = false;
            if (app.pageOptions.is_pro &&
                this.dirent_path == '/' && // only for repo
                !this.parent_group_id) { // not for group owned repo
                show_admin_perm_option = true;
            }

            this.$el.html(this.template({
                title: gettext("Share {placeholder}")
                    .replace('{placeholder}', '<span class="op-target ellipsis ellipsis-op-target" title="' + Common.HTMLescape(this.obj_name) + '">' + Common.HTMLescape(this.obj_name) + '</span>'),

                is_dir: this.is_dir,

                enable_dir_private_share: this.enable_dir_private_share,
                show_admin_perm_option: show_admin_perm_option,

                user_perm: this.user_perm,
                repo_id: this.repo_id,
                repo_encrypted: this.repo_encrypted,
                can_generate_share_link: app.pageOptions.can_generate_share_link,
                can_generate_upload_link: app.pageOptions.can_generate_upload_link
            }));

            return this;
        },

        events: {
            'click #dir-user-share-tab': 'clickUserShareTab',
            'click #dir-group-share-tab': 'clickGroupShareTab',

            'click [type="checkbox"]': 'clickCheckbox',
            'click .shared-link': 'clickToSelect',

            // download link
            'submit #generate-download-link-form': 'generateDownloadLink',
            'click #send-download-link': 'showDownloadLinkSendForm',
            'submit #send-download-link-form': 'sendDownloadLink',
            'click #cancel-share-download-link': 'cancelShareDownloadLink',
            'click #delete-download-link': 'deleteDownloadLink',
            'click #generate-download-link-form .generate-random-password': 'generateRandomDownloadPassword',
            'keydown #generate-download-link-form .generate-random-password': 'generateRandomDownloadPassword',
            'click #generate-download-link-form .show-or-hide-password': 'showOrHideDownloadPassword',
            'keydown #generate-download-link-form .show-or-hide-password': 'showOrHideDownloadPassword',

            // upload link
            'submit #generate-upload-link-form': 'generateUploadLink',
            'click #send-upload-link': 'showUploadLinkSendForm',
            'submit #send-upload-link-form': 'sendUploadLink',
            'click #cancel-share-upload-link': 'cancelShareUploadLink',
            'click #delete-upload-link': 'deleteUploadLink',
            'click #generate-upload-link-form .generate-random-password': 'generateRandomUploadPassword',
            'keydown #generate-upload-link-form .generate-random-password': 'generateRandomUploadPassword',
            'click #generate-upload-link-form .show-or-hide-password': 'showOrHideUploadPassword',
            'keydown #generate-upload-link-form .show-or-hide-password': 'showOrHideUploadPassword',

            // dir private share
            'click .invite-link-in-popup': 'closePopup',
            'click #add-dir-user-share-item .submit': 'dirUserShare',
            'click #add-dir-group-share-item .submit': 'dirGroupShare'
        },

        // To make select2 input get the right width
        clickUserShareTab: function() {
            var $add_item = $('#add-dir-user-share-item');
            $('[name="emails"]', $add_item).select2($.extend({
                'width': '100%'
            }, Common.contactInputOptionsForSelect2()));
        },

        clickGroupShareTab: function() {
            var $add_item = $('#add-dir-group-share-item');
            var prepareGroupsSelector = function(groups) {
                var group_list = [];
                for (var i = 0, len = groups.length; i < len; i++) {
                    group_list.push({
                        id: groups[i].id,
                        text: groups[i].name
                    });
                }
                $('[name="groups"]', $add_item).select2({
                    language: Common.i18nForSelect2(),
                    width: '100%',
                    multiple: true,
                    placeholder: gettext("Select groups"),
                    data: group_list,
                    escapeMarkup: function(m) { return m; }
                });
            };
            if (this.parent_group_id) { // group owned repo
                this.prepareAvailableGroupsForGroupOwnedRepo({'callback': prepareGroupsSelector});
            } else {
                this.prepareAvailableGroups({'callback': prepareGroupsSelector});
            }
        },

        clickCheckbox: function(e) {
            var $el = $(e.currentTarget);
            // for link options such as 'password', 'expire'
            $el.closest('.checkbox-label').next('div').toggleClass('hide');
        },

        clickToSelect: function(e) {
            $(e.currentTarget).trigger('select');
        },

        renderDownloadLink: function(link_data) {
            var link = link_data.link,
                d_link = link + '?dl=1'; // direct download link
            var $link = this.$('#download-link'),
                $dLink = this.$('#direct-dl-link');
            var $span = $('span', $link),
                $input = $('input', $link),
                $dSpan = $('span', $dLink),
                $dInput = $('input', $dLink);

            this.download_link = link; // for 'link send'
            this.download_link_token = link_data.token; // for 'link delete'

            $span.html(link);
            if (link_data.permissions.can_download) {
                $dLink.show().prev('dt').show();
                $dSpan.html(d_link);
            } else {
                $dLink.hide().prev('dt').hide();
            }

            if (link_data.is_expired) {
                this.$('#send-download-link').addClass('hide');
                this.$('#download-link, #direct-dl-link').append(' <span class="error">(' + gettext('Expired') + ')</span>');
            }
            this.$('#download-link-operations').removeClass('hide');

            $input.val(link).css({'width': $span.width() + 2}).show();
            $span.hide();
            $dInput.val(d_link).css({'width': $dSpan.width() + 2}).show();
            $dSpan.hide();
        },

        renderUploadLink: function(link_data) {
            var link = link_data.link;
            this.upload_link = link;
            this.upload_link_token = link_data.token;

            var $link = this.$('#upload-link'),
                $input = $('input', $link);
            $input.val(link).attr({'size': link.length}).show();
            this.$('#upload-link-operations').removeClass('hide');
        },

        downloadLinkPanelInit: function() {
            var $panel = $('#download-link-share');
            var $loadingTip = this.$('.loading-tip');
            var _this = this;

            // check if downloadLink exists
            $.ajax({
                url: Common.getUrl({name: 'share_admin_share_links'}),
                data: {
                    'repo_id': this.repo_id,
                    'path': this.dirent_path
                },
                cache: false,
                dataType: 'json',
                success: function(data) { // data is [] or [{...}]
                    if (data.length == 1) {
                        var link_data = data[0];
                        _this.renderDownloadLink(link_data);
                    } else {
                        _this.$('#generate-download-link-form').removeClass('hide');
                    }
                },
                error: function(xhr, textStatus, errorThrown) {
                    var err_msg;
                    if (xhr.responseText) {
                        if (xhr.status == 403) {
                            err_msg = gettext("Permission error");
                        } else {
                            err_msg = xhr.responseJSON.error_msg ? xhr.responseJSON.error_msg : gettext('Error');
                        }
                    } else {
                        err_msg = gettext('Please check the network.');
                    }
                    $('.error', $panel).html(err_msg).show();
                },
                complete: function() {
                    $loadingTip.hide();
                }
            });
        },

        generateRandomPassword: function(e, form) {
            if (e.type == 'keydown' && e.which != 32) { // enable only Space key
                return;
            }

            var random_password_length = app.pageOptions.share_link_password_min_length;
            var random_password = '';
            var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz0123456789';
            for (var i = 0; i < random_password_length; i++) {
                random_password += possible.charAt(Math.floor(Math.random() * possible.length));
            }
            $('input[name=password], input[name=password_again]', form).attr('type', 'text').val(random_password);
            $('.show-or-hide-password', form)
            .attr('title', gettext('Hide'))
            .attr('aria-label', gettext('Hide'))
            .removeClass('icon-eye').addClass('icon-eye-slash');
        },

        generateRandomDownloadPassword: function(e) {
            this.generateRandomPassword(e, $('#generate-download-link-form'));
        },

        showOrHidePassword: function(e, form) {
            if (e.type == 'keydown' && e.which != 32) { // enable only Space key
                return;
            }

            var icon = $('.show-or-hide-password', form),
                passwd_input = $('input[name=password], input[name=password_again]', form);
            icon.toggleClass('icon-eye icon-eye-slash');
            if (icon.hasClass('icon-eye')) {
                icon.attr('title', gettext('Show'));
                icon.attr('aria-label', gettext('Show'));
                passwd_input.attr('type', 'password');
            } else {
                icon.attr('title', gettext('Hide'));
                icon.attr('aria-label', gettext('Hide'));
                passwd_input.attr('type', 'text');
            }
        },

        showOrHideDownloadPassword: function(e) {
            this.showOrHidePassword(e, $('#generate-download-link-form'));
        },

        generateLink: function(options) {
            var link_type = options.link_type, // 'download' or 'upload'
                form = options.form,
                form_id = form.attr('id'),
                use_passwd_checkbox = $('[name="use_passwd"]', form),
                use_passwd = use_passwd_checkbox.prop('checked');
            if (link_type == 'download') {
                var set_expiration_checkbox = $('[name="set_expiration"]', form),
                    set_expiration = set_expiration_checkbox.prop('checked');

                if (app.pageOptions.is_pro) {
                    var $preview_only = $('[name="preview_only"]', form);
                    var preview_only = $preview_only.prop('checked');
                }
            }
            var post_data = {};

            if (use_passwd) {
                var passwd_input = $('[name="password"]', form),
                    passwd_again_input = $('[name="password_again"]', form),
                    passwd = $.trim(passwd_input.val()),
                    passwd_again = $.trim(passwd_again_input.val());
                if (!passwd) {
                    Common.showFormError(form_id, gettext("Please enter password"));
                    return false;
                }
                if (passwd.length < app.pageOptions.share_link_password_min_length) {
                    Common.showFormError(form_id, gettext("Password is too short"));
                    return false;
                }
                if (!passwd_again) {
                    Common.showFormError(form_id, gettext("Please enter the password again"));
                    return false;
                }
                if (passwd != passwd_again) {
                    Common.showFormError(form_id, gettext("Passwords don't match"));
                    return false;
                }
                post_data["password"] = passwd;
            }

            if (link_type == 'download' && set_expiration) {
                var expire_days_input = $('[name="expire_days"]', form),
                    expire_days = $.trim(expire_days_input.val());
                if (!expire_days) {
                    Common.showFormError(form_id, gettext("Please enter days."));
                    return false;
                }
                if (Math.floor(expire_days) != expire_days || !$.isNumeric(expire_days)) {
                    Common.showFormError(form_id, gettext("Please enter valid days"));
                    return false;
                };
                post_data["expire_days"] = expire_days;
            }

            if (link_type == 'download' && preview_only) {
                post_data["permissions"] = JSON.stringify({
                    "can_preview": true,
                    "can_download": false
                });
            }

            $('.error', form).addClass('hide').html('');
            var gen_btn = $('[type="submit"]', form);
            Common.disableButton(gen_btn);

            $.extend(post_data, {
                'repo_id': this.repo_id,
                'path': this.dirent_path
            });

            var _this = this;
            var after_op_success = function(data) {
                form.addClass('hide');
                // restore form state
                Common.enableButton(gen_btn);
                if (use_passwd) {
                    use_passwd_checkbox.prop('checked', false)
                        .parent().removeClass('checkbox-checked')
                        // hide password input
                        .end().closest('.checkbox-label').next().addClass('hide');
                    passwd_input.val('');
                    passwd_again_input.val('');
                }
                if (link_type == 'download' && set_expiration) {
                    set_expiration_checkbox.prop('checked', false)
                        .parent().removeClass('checkbox-checked')
                        // hide 'day' input
                        .end().closest('.checkbox-label').next().addClass('hide');
                    expire_days_input.val('');
                }

                if (link_type == 'download' && preview_only) {
                    $preview_only.prop('checked', false);
                }

                if (link_type == 'download') {
                    _this.renderDownloadLink(data);
                } else {
                    _this.renderUploadLink(data);
                }
            };

            Common.ajaxPost({
                'form': form,
                'post_url': options.post_url,
                'post_data': post_data,
                'after_op_success': after_op_success,
                'form_id': form_id
            });
        },

        generateDownloadLink: function() {
            this.generateLink({
                link_type: 'download',
                form: this.$('#generate-download-link-form'),
                post_url: Common.getUrl({name: 'share_admin_share_links'})
            });
            return false;
        },

        showDownloadLinkSendForm: function() {
            this.$('#send-download-link, #delete-download-link').addClass('hide');
            this.$('#send-download-link-form').removeClass('hide');
            // no addAutocomplete for email input
        },

        sendLink: function(options) {
            // options: {form:$obj, other_post_data:{}, post_url:''}
            var form = options.form,
                form_id = form.attr('id'),
                email = $.trim($('[name="email"]', form).val()),
                extra_msg = $('textarea[name="extra_msg"]', form).val();

            if (!email) {
                Common.showFormError(form_id, gettext("Please input at least an email."));
                return false;
            };

            var submit_btn = $('[type="submit"]', form);
            var sending_tip = $('.sending-tip', form);
            Common.disableButton(submit_btn);
            sending_tip.removeClass('hide');

            var post_data = {
                email: email,
                extra_msg: extra_msg
            };
            $.extend(post_data, options.other_post_data);

            var after_op_success = function(data) {
                $.modal.close();
                var msg = gettext("Successfully sent to {placeholder}")
                    .replace('{placeholder}', data['send_success'].join(', '));
                Common.feedback(msg, 'success');
                if (data['send_failed'].length > 0) {
                    msg += '<br />' + gettext("Failed to send to {placeholder}")
                        .replace('{placeholder}', data['send_failed'].join(', '));
                    Common.feedback(msg, 'info');
                }
            };
            var after_op_error = function(xhr) {
                sending_tip.addClass('hide');
                Common.enableButton(submit_btn);
                var err;
                if (xhr.responseText) {
                    err = JSON.parse(xhr.responseText).error;
                } else {
                    err = gettext("Failed. Please check the network.");
                }
                Common.showFormError(form_id, err);
                Common.enableButton(submit_btn);
            };

            Common.ajaxPost({
                'form': form,
                'post_url': options.post_url,
                'post_data': post_data,
                'after_op_success': after_op_success,
                'after_op_error': after_op_error,
                'form_id': form_id
            });
        },

        sendDownloadLink: function() {
            this.sendLink({
                form: this.$('#send-download-link-form'),
                other_post_data: {
                    file_shared_link: this.download_link,
                    file_shared_name: this.obj_name,
                    file_shared_type: this.is_dir ? 'd' : 'f'
                },
                post_url: Common.getUrl({name: 'send_shared_download_link'})
            });
            return false;
        },

        cancelShareDownloadLink: function() {
            this.$('#send-download-link, #delete-download-link').removeClass('hide');
            this.$('#send-download-link-form').addClass('hide');
        },

        deleteDownloadLink: function() {
            var _this = this;
            $.ajax({
                url: Common.getUrl({
                    'name': 'share_admin_share_link',
                    'token': this.download_link_token
                }),
                type: 'DELETE',
                cache: false,
                beforeSend: Common.prepareCSRFToken,
                dataType: 'json',
                success: function(data) {
                    _this.$('#generate-download-link-form').removeClass('hide');
                    _this.$('#download-link-operations').addClass('hide');
                }
            });
        },

        uploadLinkPanelInit: function() {
            var $panel = $('#dir-upload-link-share');
            var $loadingTip = this.$('.loading-tip').show();
            var _this = this;
            // check if upload link exists
            $.ajax({
                url: Common.getUrl({name: 'share_admin_upload_links'}),
                data: {
                    'repo_id': this.repo_id,
                    'path': this.dirent_path
                },
                cache: false,
                dataType: 'json',
                success: function(data) { // data is [] or [{...}]
                    if (data.length == 1) {
                        var link_data = data[0];
                        _this.renderUploadLink(link_data);
                    } else {
                        _this.$('#generate-upload-link-form').removeClass('hide');
                    }
                    $('.tip', $panel).show();
                },
                error: function(xhr, textStatus, errorThrown) {
                    var err_msg;
                    if (xhr.responseText) {
                        if (xhr.status == 403) {
                            err_msg = gettext("Permission error");
                        } else {
                            err_msg = xhr.responseJSON.error_msg ? xhr.responseJSON.error_msg : gettext('Error');
                        }
                    } else {
                        err_msg = gettext('Please check the network.');
                    }
                    $('.error', $panel).html(err_msg).show();
                },
                complete: function() {
                    $loadingTip.hide();
                }
            });
        },

        generateRandomUploadPassword: function(e) {
            this.generateRandomPassword(e, $('#generate-upload-link-form'));
        },

        showOrHideUploadPassword: function(e) {
            this.showOrHidePassword(e, $('#generate-upload-link-form'));
        },

        generateUploadLink: function() {
            this.generateLink({
                link_type: 'upload',
                form: this.$('#generate-upload-link-form'),
                post_url: Common.getUrl({name: 'share_admin_upload_links'})
            });
            return false;
        },

        showUploadLinkSendForm: function() {
            this.$('#send-upload-link, #delete-upload-link').addClass('hide');
            this.$('#send-upload-link-form').removeClass('hide');
            // no addAutocomplete for email input
        },

        sendUploadLink: function() {
            this.sendLink({
                form: this.$('#send-upload-link-form'),
                other_post_data: {
                    shared_upload_link: this.upload_link
                },
                post_url: Common.getUrl({name: 'send_shared_upload_link'})
            });
            return false;
        },

        cancelShareUploadLink: function() {
            this.$('#send-upload-link, #delete-upload-link').removeClass('hide');
            this.$('#send-upload-link-form').addClass('hide');
        },

        deleteUploadLink: function() {
            var _this = this;
            $.ajax({
                url: Common.getUrl({
                    'name': 'share_admin_upload_link',
                    'token': this.upload_link_token
                }),
                type: 'DELETE',
                cache: false,
                beforeSend: Common.prepareCSRFToken,
                dataType: 'json',
                success: function(data) {
                    _this.$('#generate-upload-link-form').removeClass('hide');
                    _this.$('#upload-link-operations').addClass('hide');
                }
            });
        },

        prepareUserItemData: function(item) {
            var item_data = {
                'for_user': true
            };
            if (this.parent_group_id) { // group owned repo
                // [{permission: "rw", user_name: "llj", user_email: "llj@1.com", user_contact_email: "llj@1.com"}]
                $.extend(item_data, {
                    "user_email": item.user_email,
                    "user_name": item.user_name,
                    "permission": item.permission,
                    'parent_group_id': this.parent_group_id
                });
            } else {
                $.extend(item_data, {
                    "user_email": item.user_info.name,
                    "user_name": item.user_info.nickname,
                    "post_name": item.user_info.post_name,
                    "work_no": item.user_info.work_no,
                    "permission": item.permission,
                    'is_admin': item.is_admin
                });
            }

            return item_data;
        },

        dirUserSharePanelInit: function() {
            var _this = this;

            var $loadingTip = this.$('.loading-tip').show();
            var $panel = this.$('#dir-user-share');
            var $table = $('table', $panel);
            var $add_item = $('#add-dir-user-share-item');

            var repo_id = this.repo_id,
                path = this.dirent_path;
            var url, data;
            if (this.parent_group_id) {
                url = Common.getUrl({
                    name: 'group_owned_repo_user_share',
                    repo_id: repo_id
                });
                data = {
                    'path': path
                };
            } else {
                url = Common.getUrl({
                    name: 'dir_shared_items',
                    repo_id: repo_id
                });
                data = {
                    'p': path,
                    'share_type': 'user'
                };
            }

            $.ajax({
                url: url,
                data: data,
                cache: false,
                dataType: 'json',
                success: function(data) {
                    $(data).each(function(index, item) {
                        var new_item = new FolderShareItemView({
                            'repo_id': repo_id,
                            'path': path,
                            'item_data': _this.prepareUserItemData(item)
                        });
                        $add_item.after(new_item.el);
                    });
                    $table.removeClass('hide');
                },
                error: function(xhr, textStatus, errorThrown) {
                    var err_msg;
                    if (xhr.responseText) {
                        if (xhr.status == 403) {
                            err_msg = gettext("Permission error");
                        } else {
                            err_msg = xhr.responseJSON.error_msg ? xhr.responseJSON.error_msg : gettext('Error');
                        }
                    } else {
                        err_msg = gettext('Please check the network.');
                    }
                    $('.error', $panel).html(err_msg).show();
                },
                complete: function() {
                    $loadingTip.hide();
                }
            });
        },

        prepareGroupItemData: function(item) {
            var item_data = {
                'for_user': false
            };
            if (this.parent_group_id) { // address book group
                $.extend(item_data, {
                    "group_id": item.group_id,
                    "group_name": item.group_name,
                    "permission": item.permission,
                    "parent_group_id": this.parent_group_id
                });
            } else {
                $.extend(item_data, {
                    "group_id": item.group_info.id,
                    "group_name": item.group_info.name,
                    "permission": item.permission,
                    'is_admin': item.is_admin
                });
            }

            return item_data;
        },

        // for common repo
        prepareAvailableGroups: function(options) {
            var groups = [];
            $.ajax({
                url: Common.getUrl({
                    name: app.pageOptions.enable_share_to_all_groups ? 'shareable_groups' : 'groups'
                }),
                type: 'GET',
                dataType: 'json',
                cache: false,
                success: function(data){
                    for (var i = 0, len = data.length; i < len; i++) {
                        groups.push({
                            'id': data[i].id,
                            'name': data[i].name
                        });
                    }
                    groups.sort(function(a, b) {
                        return Common.compareTwoWord(a.name, b.name);
                    });
                },
                error: function(xhr, textStatus, errorThrown) {
                    // do nothing
                },
                complete: function() {
                    options.callback(groups);
                }
            });
        },

        // for group owned repo
        prepareAvailableGroupsForGroupOwnedRepo: function(options) {
            var groups = [];
            $.ajax({
                url: Common.getUrl({
                    name: 'all_groups'
                }),
                type: 'GET',
                dataType: 'json',
                cache: false,
                success: function(data){
                    for (var i = 0, len = data.length; i < len; i++) {
                        groups.push({
                            'id': data[i].id,
                            'name': data[i].name
                        });
                    }
                    groups.sort(function(a, b) {
                        return Common.compareTwoWord(a.name, b.name);
                    });
                },
                error: function(xhr, textStatus, errorThrown) {
                    // do nothing
                },
                complete: function() {
                    options.callback(groups);
                }
            });
        },

        dirGroupSharePanelInit: function() {
            var _this = this;

            var $loadingTip = this.$('.loading-tip').show();
            var $panel = this.$('#dir-group-share');
            var $table = $('table', $panel);
            var $add_item = $('#add-dir-group-share-item');

            var url, data;
            var repo_id = this.repo_id,
                path = this.dirent_path;

            if (this.parent_group_id) { // group owned repo
                url = Common.getUrl({
                    name: 'group_owned_repo_group_share',
                    repo_id: repo_id
                });
                data = {
                    'path': path
                };
            } else {
                url = Common.getUrl({
                    name: 'dir_shared_items',
                    repo_id: repo_id
                });
                data = {
                    'p': path,
                    'share_type': 'group'
                };
            }

            $.ajax({
                url: url,
                data: data,
                cache: false,
                dataType: 'json',
                success: function(data) {
                    // for 'group owned repo', the data is like
                    // `[{"permission":"rw","group_id":4,"group_name":"ab group"}]`
                    $(data).each(function(index, item) {
                        var new_item = new FolderShareItemView({
                            'repo_id': repo_id,
                            'path': path,
                            'item_data': _this.prepareGroupItemData(item)
                        });
                        $add_item.after(new_item.el);
                    });
                    $table.removeClass('hide');
                },
                error: function(xhr, textStatus, errorThrown) {
                    var err_msg;
                    if (xhr.responseText) {
                        if (xhr.status == 403) {
                            err_msg = gettext("Permission error");
                        } else {
                            err_msg = xhr.responseJSON.error_msg ? xhr.responseJSON.error_msg : gettext('Error');
                        }
                    } else {
                        err_msg = gettext('Please check the network.');
                    }
                    $('.error', $panel).html(err_msg).show();
                },
                complete: function() {
                    $loadingTip.hide();
                }
            });
        },

        closePopup: function() {
            $.modal.close();
        },

        dirUserShare: function () {
            var _this = this;

            var $panel = $('#dir-user-share');
            var $form = this.$('#add-dir-user-share-item'); // pseudo form

            var $emails_input = $('[name="emails"]', $form),
                emails = $emails_input.val(); // []
            if (!emails.length) {
                return false;
            }

            var $add_item = $('#add-dir-user-share-item');
            var repo_id = this.repo_id,
                path = this.dirent_path;
            var $perm = $('[name="permission"]', $form);
            var perm = $perm.val();
            var $error = $('.error', $panel);
            var $submitBtn = $('[type="submit"]', $form);

            var url, method, data;
            if (this.parent_group_id) { // group owned repo
                url = Common.getUrl({
                    name: 'group_owned_repo_user_share',
                    repo_id: repo_id
                });
                method = 'POST';
                data = {
                    'permission': perm,
                    'path': path,
                    'username': emails
                };
            } else {
                url = Common.getUrl({
                    name: 'dir_shared_items',
                    repo_id: repo_id
                }) + '?p=' + encodeURIComponent(path);
                method = 'PUT';
                data = {
                    'share_type': 'user',
                    'username': emails,
                    'permission': perm
                };
            }

            Common.disableButton($submitBtn);
            $.ajax({
                url: url,
                dataType: 'json',
                method: method,
                beforeSend: Common.prepareCSRFToken,
                traditional: true,
                data: data,
                success: function(data) {
                    // success: [{permission: "rw", user_name: "llj", user_email: "llj@1.com", user_contact_email: "llj@1.com"}]
                    if (data.success.length > 0) {
                        $(data.success).each(function(index, item) {
                            var new_item = new FolderShareItemView({
                                'repo_id': repo_id,
                                'path': path,
                                'item_data': _this.prepareUserItemData(item)
                            });
                            $add_item.after(new_item.el);
                        });
                        $emails_input.val(null).trigger('change'); // clear the selected items
                        $('option', $perm).prop('selected', false);
                        $('[value="rw"]', $perm).prop('selected', true);
                        $error.addClass('hide');
                    }
                    if (data.failed.length > 0) {
                        var err_msg = '';
                        $(data.failed).each(function(index, item) {
                            err_msg += item.error_msg + '<br />';
                        });
                        $error.html(err_msg).removeClass('hide');
                    }
                },
                error: function(xhr) {
                    var err_msg;
                    if (xhr.responseText) {
                        var parsed_resp = JSON.parse(xhr.responseText);
                        err_msg = parsed_resp.error||parsed_resp.error_msg;
                    } else {
                        err_msg = gettext("Failed. Please check the network.");
                    }
                    $error.html(err_msg).removeClass('hide');
                },
                complete: function() {
                    Common.enableButton($submitBtn);
                }
            });
        },

        dirGroupShare: function () {
            var _this = this;

            var $panel = $('#dir-group-share');
            var $form = this.$('#add-dir-group-share-item'); // pseudo form

            var $groups_input = $('[name="groups"]', $form),
                groups = $groups_input.val(); // [] or [group.id]

            if (!groups.length) {
                return false;
            }

            var $add_item = $('#add-dir-group-share-item');
            var repo_id = this.repo_id,
                path = this.dirent_path;
            var $perm = $('[name="permission"]', $form),
                perm = $perm.val();
            var $error = $('.error', $panel);
            var $submitBtn = $('[type="submit"]', $form);

            var url, method, data;
            if (this.parent_group_id) {
                url = Common.getUrl({
                    name: 'group_owned_repo_group_share',
                    repo_id: repo_id
                });
                method = 'POST';
                data = {
                    'path': path,
                    'group_id': groups,
                    'permission': perm
                };
            } else {
                url = Common.getUrl({
                    name: 'dir_shared_items',
                    repo_id: repo_id
                }) + '?p=' + encodeURIComponent(path);
                method = 'PUT';
                data = {
                    'share_type': 'group',
                    'group_id': groups,
                    'permission': perm
                };
            }

            Common.disableButton($submitBtn);
            $.ajax({
                url: url,
                dataType: 'json',
                method: method,
                beforeSend: Common.prepareCSRFToken,
                traditional: true,
                data: data,
                success: function(data) {
                    if (data.success.length > 0) {
                        $(data.success).each(function(index, item) {
                            var new_item = new FolderShareItemView({
                                'repo_id': repo_id,
                                'path': path,
                                'item_data': _this.prepareGroupItemData(item)
                            });
                            $add_item.after(new_item.el);
                        });
                        $groups_input.val(null).trigger('change'); // clear the selected items
                        $('option', $perm).prop('selected', false);
                        $('[value="rw"]', $perm).prop('selected', true);
                        $error.addClass('hide');
                    }
                    if (data.failed.length > 0) {
                        var err_msg = '';
                        $(data.failed).each(function(index, item) {
                            err_msg += Common.HTMLescape(item.group_name) + ': ' + item.error_msg + '<br />';
                        });
                        $error.html(err_msg).removeClass('hide');
                    }
                },
                error: function(xhr) {
                    var err_msg;
                    if (xhr.responseText) {
                        var parsed_resp = JSON.parse(xhr.responseText);
                        err_msg = parsed_resp.error||parsed_resp.error_msg;
                    } else {
                        err_msg = gettext("Failed. Please check the network.");
                    }
                    $error.html(err_msg).removeClass('hide');
                },
                complete: function() {
                    Common.enableButton($submitBtn);
                }
            });
        }

    });

    return SharePopupView;
});
