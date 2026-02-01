package com.kleff.projectmanagementservice.buisnesslayer.collaborator;

import com.kleff.projectmanagementservice.presentationlayer.collaborator.CollaboratorRequestModel;
import com.kleff.projectmanagementservice.presentationlayer.collaborator.CollaboratorResponseModel;

import java.util.List;

public interface CollaboratorService {

    CollaboratorResponseModel addCollaborator(CollaboratorRequestModel request, String invitedBy);

    CollaboratorResponseModel updateCollaborator(String projectId, String userId, CollaboratorRequestModel request,
            String actorId);

    List<CollaboratorResponseModel> getProjectCollaborators(String projectId);

    void removeCollaborator(String projectId, String userId, String actorId);

    List<String> getUserPermissions(String projectId, String userId);
}