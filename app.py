from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

# Инициализация приложения
app = Flask(__name__, static_folder='frontend', static_url_path='')

# Конфигурация
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-jwt-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# Настройка базы данных
basedir = os.path.abspath(os.path.dirname(__file__))
instance_path = os.path.join(basedir, 'instance')
if not os.path.exists(instance_path):
    os.makedirs(instance_path)

app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(instance_path, "evaluations.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Инициализация расширений
CORS(app, resources={r"/api/*": {"origins": "*"}})
db = SQLAlchemy(app)
jwt = JWTManager(app)

# ==================== МОДЕЛИ БАЗЫ ДАННЫХ ====================

class Evaluation(db.Model):
    __tablename__ = 'evaluations'
    
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    evaluation_date = db.Column(db.Date, nullable=False)
    manager_name = db.Column(db.String(200), nullable=False)
    phone_number = db.Column(db.String(50))
    lead_link = db.Column(db.Text)
    call_date = db.Column(db.Date, nullable=False)
    call_duration = db.Column(db.String(20), nullable=False)
    is_target = db.Column(db.String(10), nullable=False, default='да')
    later_work = db.Column(db.String(10), nullable=False, default='нет')
    is_good_call = db.Column(db.String(10), nullable=False, default='нет')
    
    contact_score = db.Column(db.Integer, nullable=False, default=0)
    contact_errors = db.Column(db.Text)
    contact_comment = db.Column(db.Text)
    
    presentation_score = db.Column(db.Integer, nullable=False, default=0)
    presentation_errors = db.Column(db.Text)
    presentation_comment = db.Column(db.Text)
    
    objections_score = db.Column(db.Integer, nullable=False, default=0)
    objections_errors = db.Column(db.Text)
    objections_comment = db.Column(db.Text)
    
    closing_score = db.Column(db.Integer, nullable=False, default=0)
    closing_errors = db.Column(db.Text)
    closing_comment = db.Column(db.Text)
    
    tov_score = db.Column(db.Integer, nullable=False, default=0)
    tov_errors = db.Column(db.Text)
    tov_comment = db.Column(db.Text)
    
    critical_error = db.Column(db.Text)
    overall_comment = db.Column(db.Text)
    total_score = db.Column(db.Integer, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'evaluation_date': self.evaluation_date.isoformat() if self.evaluation_date else None,
            'manager_name': self.manager_name,
            'phone_number': self.phone_number,
            'lead_link': self.lead_link,
            'call_date': self.call_date.isoformat() if self.call_date else None,
            'call_duration': self.call_duration,
            'is_target': self.is_target,
            'later_work': self.later_work,
            'is_good_call': self.is_good_call,
            'contact_score': self.contact_score,
            'contact_errors': self.contact_errors,
            'contact_comment': self.contact_comment,
            'presentation_score': self.presentation_score,
            'presentation_errors': self.presentation_errors,
            'presentation_comment': self.presentation_comment,
            'objections_score': self.objections_score,
            'objections_errors': self.objections_errors,
            'objections_comment': self.objections_comment,
            'closing_score': self.closing_score,
            'closing_errors': self.closing_errors,
            'closing_comment': self.closing_comment,
            'tov_score': self.tov_score,
            'tov_errors': self.tov_errors,
            'tov_comment': self.tov_comment,
            'critical_error': self.critical_error,
            'overall_comment': self.overall_comment,
            'total_score': self.total_score
        }


class Manager(db.Model):
    __tablename__ = 'managers'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False, unique=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# ==================== ИНИЦИАЛИЗАЦИЯ ====================

def init_db():
    with app.app_context():
        db.create_all()
        
        if Manager.query.count() == 0:
            initial_managers = [
                'Аксюбина Ангелина', 'Волков Алексей',
                'Алексеева Татьяна', 'Жирякова Оксана', 'Конаныхина Татьяна',
                'Мандрик Асель', 'Мельник Полина',
                'Мищенко Дарья', 'Фролова Диана', 'Ходневич София',
                'Чупрунова Ирина', 'Казначеева Динара', 'Васильчикова Диана'
            ]
            for manager_name in initial_managers:
                manager = Manager(name=manager_name)
                db.session.add(manager)
            db.session.commit()
            print("✅ Добавлены начальные сотрудники")
        
        print("✅ База данных инициализирована")


# ==================== СТАТИКА ====================

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')


# ==================== API АВТОРИЗАЦИЯ ====================

@app.route('/api/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        password = data.get('password')
        admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
        
        if password == admin_password:
            access_token = create_access_token(identity='admin')
            return jsonify({
                'success': True,
                'access_token': access_token,
                'message': 'Вход выполнен успешно'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Неверный пароль'
            }), 401
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/verify', methods=['GET', 'OPTIONS'])
@jwt_required(optional=True)
def verify_token():
    if request.method == 'OPTIONS':
        return '', 200
    return jsonify({'valid': True}), 200


# ==================== API УПРАВЛЕНИЕ СОТРУДНИКАМИ ====================

@app.route('/api/managers', methods=['GET', 'OPTIONS'])
@jwt_required(optional=True)
def get_managers():
    if request.method == 'OPTIONS':
        return '', 200
    try:
        managers = Manager.query.filter_by(is_active=True).order_by(Manager.name).all()
        return jsonify({'success': True, 'data': [m.to_dict() for m in managers]}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/managers/all', methods=['GET', 'OPTIONS'])
@jwt_required(optional=True)
def get_all_managers():
    if request.method == 'OPTIONS':
        return '', 200
    try:
        managers = Manager.query.order_by(Manager.name).all()
        return jsonify({'success': True, 'data': [m.to_dict() for m in managers]}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/managers', methods=['POST', 'OPTIONS'])
@jwt_required(optional=True)
def add_manager():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        name = data.get('name', '').strip()
        
        if not name:
            return jsonify({'success': False, 'message': 'Имя сотрудника не может быть пустым'}), 400
        
        existing = Manager.query.filter_by(name=name).first()
        if existing:
            if existing.is_active:
                return jsonify({'success': False, 'message': f'Сотрудник "{name}" уже существует'}), 400
            else:
                existing.is_active = True
                db.session.commit()
                return jsonify({'success': True, 'data': existing.to_dict(), 'message': f'Сотрудник "{name}" восстановлен'}), 200
        
        manager = Manager(name=name)
        db.session.add(manager)
        db.session.commit()
        
        return jsonify({'success': True, 'data': manager.to_dict(), 'message': f'Сотрудник "{name}" добавлен'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/managers/<int:manager_id>', methods=['PUT', 'OPTIONS'])
@jwt_required(optional=True)
def update_manager(manager_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        new_name = data.get('name', '').strip()
        
        if not new_name:
            return jsonify({'success': False, 'message': 'Имя сотрудника не может быть пустым'}), 400
        
        manager = Manager.query.get(manager_id)
        if not manager:
            return jsonify({'success': False, 'message': 'Сотрудник не найден'}), 404
        
        existing = Manager.query.filter(Manager.name == new_name, Manager.id != manager_id).first()
        if existing:
            return jsonify({'success': False, 'message': f'Сотрудник с именем "{new_name}" уже существует'}), 400
        
        old_name = manager.name
        manager.name = new_name
        
        evaluations = Evaluation.query.filter_by(manager_name=old_name).all()
        for eval_item in evaluations:
            eval_item.manager_name = new_name
        
        db.session.commit()
        return jsonify({'success': True, 'data': manager.to_dict(), 'message': f'Сотрудник переименован'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/managers/<int:manager_id>', methods=['DELETE', 'OPTIONS'])
@jwt_required(optional=True)
def delete_manager(manager_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        manager = Manager.query.get(manager_id)
        if not manager:
            return jsonify({'success': False, 'message': 'Сотрудник не найден'}), 404
        
        manager.is_active = False
        db.session.commit()
        
        return jsonify({'success': True, 'message': f'Сотрудник "{manager.name}" удален'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


# ==================== API ОЦЕНКИ ====================

@app.route('/api/evaluations', methods=['GET', 'OPTIONS'])
@jwt_required(optional=True)
def get_evaluations():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        search = request.args.get('search', '')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        managers = request.args.getlist('managers[]')
        is_good_call = request.args.get('is_good_call')
        
        query = Evaluation.query
        
        if search:
            query = query.filter(Evaluation.manager_name.ilike(f'%{search}%'))
        if start_date:
            query = query.filter(Evaluation.call_date >= start_date)
        if end_date:
            query = query.filter(Evaluation.call_date <= end_date)
        if managers and len(managers) > 0:
            query = query.filter(Evaluation.manager_name.in_(managers))
        if is_good_call and is_good_call != 'all':
            query = query.filter(Evaluation.is_good_call == is_good_call)
        
        evaluations = query.order_by(Evaluation.created_at.desc()).all()
        return jsonify({'success': True, 'data': [e.to_dict() for e in evaluations]}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/evaluations', methods=['POST', 'OPTIONS'])
@jwt_required(optional=True)
def create_evaluation():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        
        evaluation_date = datetime.strptime(data['evaluation_date'], '%Y-%m-%d').date()
        call_date = datetime.strptime(data['call_date'], '%Y-%m-%d').date()
        
        evaluation = Evaluation(
            evaluation_date=evaluation_date,
            manager_name=data['manager_name'],
            phone_number=data.get('phone_number'),
            lead_link=data.get('lead_link'),
            call_date=call_date,
            call_duration=data['call_duration'],
            is_target=data['is_target'],
            later_work=data['later_work'],
            is_good_call=data['is_good_call'],
            contact_score=data['contact_score'],
            contact_errors=data.get('contact_errors'),
            contact_comment=data.get('contact_comment'),
            presentation_score=data['presentation_score'],
            presentation_errors=data.get('presentation_errors'),
            presentation_comment=data.get('presentation_comment'),
            objections_score=data['objections_score'],
            objections_errors=data.get('objections_errors'),
            objections_comment=data.get('objections_comment'),
            closing_score=data['closing_score'],
            closing_errors=data.get('closing_errors'),
            closing_comment=data.get('closing_comment'),
            tov_score=data.get('tov_score', 0),
            tov_errors=data.get('tov_errors'),
            tov_comment=data.get('tov_comment'),
            critical_error=data.get('critical_error'),
            overall_comment=data.get('overall_comment'),
            total_score=data['total_score']
        )
        
        db.session.add(evaluation)
        db.session.commit()
        
        return jsonify({'success': True, 'data': evaluation.to_dict(), 'message': 'Оценка успешно сохранена'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/evaluations/<int:evaluation_id>', methods=['DELETE', 'OPTIONS'])
@jwt_required(optional=True)
def delete_evaluation(evaluation_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        evaluation = Evaluation.query.get(evaluation_id)
        if not evaluation:
            return jsonify({'success': False, 'message': 'Оценка не найдена'}), 404
        
        db.session.delete(evaluation)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Оценка удалена'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/stats', methods=['POST', 'OPTIONS'])
@jwt_required(optional=True)
def get_statistics():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        managers = data.get('managers', [])
        
        query = Evaluation.query
        
        if start_date:
            query = query.filter(Evaluation.call_date >= start_date)
        if end_date:
            query = query.filter(Evaluation.call_date <= end_date)
        if managers and len(managers) > 0:
            query = query.filter(Evaluation.manager_name.in_(managers))
        
        evaluations = query.all()
        
        total_calls = len(evaluations)
        if total_calls > 0:
            avg_score = sum(e.total_score for e in evaluations) / total_calls
            avg_contact = sum(e.contact_score for e in evaluations) / total_calls
            avg_presentation = sum(e.presentation_score for e in evaluations) / total_calls
            avg_objections = sum(e.objections_score for e in evaluations) / total_calls
            avg_closing = sum(e.closing_score for e in evaluations) / total_calls
            good_calls = sum(1 for e in evaluations if e.is_good_call == 'да')
            target_calls = sum(1 for e in evaluations if e.is_target == 'да')
            later_work_calls = sum(1 for e in evaluations if e.later_work == 'да')
        else:
            avg_score = avg_contact = avg_presentation = avg_objections = avg_closing = 0
            good_calls = target_calls = later_work_calls = 0
        
        errors_stats = {'contact': {}, 'presentation': {}, 'objections': {}, 'closing': {}, 'tov': {}, 'critical': 0}
        
        for eval_item in evaluations:
            if eval_item.contact_errors:
                for error in eval_item.contact_errors.split('; '):
                    if error and error != 'Ок':
                        errors_stats['contact'][error] = errors_stats['contact'].get(error, 0) + 1
            if eval_item.presentation_errors:
                for error in eval_item.presentation_errors.split('; '):
                    if error and error != 'Ок':
                        errors_stats['presentation'][error] = errors_stats['presentation'].get(error, 0) + 1
            if eval_item.objections_errors:
                for error in eval_item.objections_errors.split('; '):
                    if error and error != 'Ок':
                        errors_stats['objections'][error] = errors_stats['objections'].get(error, 0) + 1
            if eval_item.closing_errors:
                for error in eval_item.closing_errors.split('; '):
                    if error and error != 'Ок':
                        errors_stats['closing'][error] = errors_stats['closing'].get(error, 0) + 1
            if eval_item.tov_errors:
                for error in eval_item.tov_errors.split('; '):
                    if error and error != 'Ок':
                        errors_stats['tov'][error] = errors_stats['tov'].get(error, 0) + 1
            if eval_item.critical_error and eval_item.critical_error.strip():
                errors_stats['critical'] += 1
        
        return jsonify({
            'success': True,
            'data': {
                'total_calls': total_calls,
                'avg_score': round(avg_score, 1),
                'avg_contact': round(avg_contact, 1),
                'avg_presentation': round(avg_presentation, 1),
                'avg_objections': round(avg_objections, 1),
                'avg_closing': round(avg_closing, 1),
                'good_calls': good_calls,
                'target_calls': target_calls,
                'later_work_calls': later_work_calls,
                'errors_stats': errors_stats
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# ==================== ЗАПУСК ====================

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5002))
    print(f"\n🚀 Сервер запущен на http://127.0.0.1:{port}")
    print(f"🔑 Пароль для входа: {os.environ.get('ADMIN_PASSWORD', 'admin123')}\n")
    app.run(debug=True, host='127.0.0.1', port=port)