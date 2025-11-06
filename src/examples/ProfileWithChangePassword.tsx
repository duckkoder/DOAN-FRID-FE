import React, { useState } from 'react';
import { Button } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import ChangePasswordModal from '../components/ChangePasswordModal';

/**
 * Example: Student Profile Page with Change Password
 */
const StudentProfileExample: React.FC = () => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  return (
    <div>
      <h2>Student Profile</h2>
      
      {/* Your profile form here */}
      
      <div style={{ marginTop: '20px' }}>
        <Button
          icon={<LockOutlined />}
          onClick={() => setShowPasswordModal(true)}
        >
          Change Password
        </Button>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        userRole="student"
      />
    </div>
  );
};

/**
 * Example: Teacher Profile Page with Change Password
 */
const TeacherProfileExample: React.FC = () => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  return (
    <div>
      <h2>Teacher Profile</h2>
      
      {/* Your profile form here */}
      
      <div style={{ marginTop: '20px' }}>
        <Button
          icon={<LockOutlined />}
          onClick={() => setShowPasswordModal(true)}
        >
          Change Password
        </Button>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        userRole="teacher"
      />
    </div>
  );
};

export { StudentProfileExample, TeacherProfileExample };
